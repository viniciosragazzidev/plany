'use server'

import { db } from "@/lib/db";
import { 
  publicEditais, 
  publicSubjects, 
  publicTopics, 
  studyBenches, 
  editalItems, 
  subjects, 
  materials,
  materialChunks
} from "@/lib/db/schema";
import { eq, ilike, or, and } from "drizzle-orm";
import { ActionResponse, actionError, actionSuccess } from "./types";
import { generateAIContent } from "@/lib/ai-service";
import { revalidatePath } from "next/cache";

/**
 * Searches for public editais based on a query string.
 */
export async function searchPublicEditais(query: string): Promise<ActionResponse<any[]>> {
  try {
    const results = await db.query.publicEditais.findMany({
      where: or(
        ilike(publicEditais.institution, `%${query}%`),
        ilike(publicEditais.role, `%${query}%`),
        ilike(publicEditais.slugName, `%${query}%`)
      ),
      limit: 10,
      orderBy: (table, { desc }) => [desc(table.createdAt)]
    });
    return actionSuccess(results);
  } catch (error: any) {
    return actionError(error.message);
  }
}

/**
 * Clones a public edital structure to a user's study bench.
 * Zero AI cost.
 */
export async function selectPublicEdital(benchId: string, publicEditalId: string): Promise<ActionResponse<void>> {
  try {
    const publicEdital = await db.query.publicEditais.findFirst({
      where: eq(publicEditais.id, publicEditalId),
      with: {
        subjects: {
          with: {
            topics: true
          }
        }
      }
    });

    if (!publicEdital) return actionError("Edital público não encontrado");

    await db.transaction(async (tx) => {
      // Use premium contestName for goalName if available, otherwise fall back to pretty slug
      const goalName = publicEdital.contestName || publicEdital.slugName.split('-').join(' ');

      // 1. Update bench metadata
      await tx.update(studyBenches)
        .set({
          goalName: goalName,
          publicEditalId: publicEdital.id,
          hasDiscoveredTopics: true
        })
        .where(eq(studyBenches.id, benchId));


      // 2. Clone subjects and topics
      for (const pSubject of publicEdital.subjects) {
        // Create private subject
        const [newSubject] = await tx.insert(subjects).values({
          benchId,
          title: pSubject.name,
          priority: 3,
          colorTag: "#3b82f6", // Default blue
          icon: "Folder"
        }).returning();

        // Create edital items (topics)
        for (const pTopic of pSubject.topics) {
          await tx.insert(editalItems).values({
            benchId,
            category: pSubject.name,
            topic: pTopic.name,
            weight: 1,
            isCovered: false
          });
        }
      }
    });

    revalidatePath(`/dashboard/bancadas/${benchId}`);
    return actionSuccess(undefined, "Edital importado da biblioteca pública!");
  } catch (error: any) {
    console.error("Erro ao selecionar edital público:", error);
    return actionError(error.message);
  }
}

/**
 * Phase 2: Metadata Extraction
 * Uses Gemini to extract Institution, Role, and Year from PDF text.
 */
export async function analyzeEditalMetadata(text: string): Promise<ActionResponse<{ institution: string, role: string, year: string, contestName: string }>> {
  try {
    const prompt = `Você é um Analista de Editais e Especialista em Concursos. 
    Analise o texto do cabeçalho do edital fornecido e identifique os dados exatos.

    MISSÃO:
    1. INSTITUTION: Nome da instituição organizadora ou órgão (ex: Marinha do Brasil, INSS, Polícia Federal).
    2. ROLE: O cargo ou cargos descritos no edital.
    3. YEAR: O ano de publicação do edital.
    4. CONTEST_NAME: Um título bonito e completo para o concurso, incluindo siglas se houver. 
       Exemplos: 
       - "Processo Seletivo para Cursos de Formação de Aquaviários (CFAQ-MOC e CAAQ-CTS) 2026"
       - "Concurso Público para Agente e Escrivão da Polícia Federal 2025"
       - "Exame Unificado da OAB XXXIX 2024"

    REGRAS DE OURO:
    - O CONTEST_NAME deve ser formal e conter as informações que um aluno usaria para identificar o concurso rapidamente.
    - Se encontrar siglas como CFAQ, CAAQ, etc., inclua-as no nome.
    - O Ano deve ser estritamente YYYY.

    Retorne APENAS um JSON válido no formato:
    { 
      "institution": "Nome do Órgão", 
      "role": "Cargo(s)", 
      "year": "YYYY",
      "contestName": "Nome Bonito e Completo do Concurso"
    }`;

    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ 
        role: "user", 
        parts: [{ text: `TEXTO DO EDITAL (TOPO):\n\n${text.substring(0, 8000)}` }] 
      }],
      config: {
        systemInstruction: { parts: [{ text: prompt }] },
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text.replace(/```json/g, "").replace(/```/g, "").trim());
    return actionSuccess(result);
  } catch (error: any) {
    return actionError(error.message);
  }
}

/**
 * Phase 3: Secondary Deduplication Check
 * Robust check by File Hash OR Normalized Metadata
 */
export async function checkExistingEdital(metadata: { institution: string, role: string, year: string, contestName: string }, fileHash?: string): Promise<string | null> {
  // 1. Exact File Hash Check (Highest Confidence)
  if (fileHash) {
    const byHash = await db.query.publicEditais.findFirst({
      where: eq(publicEditais.fileHash, fileHash)
    });
    if (byHash) return byHash.id;
  }

  // 2. Normalized Metadata Check
  // We use a combination of Institution + Year + fuzzy Role matching
  const potentialMatches = await db.query.publicEditais.findMany({
    where: and(
      ilike(publicEditais.institution, `%${metadata.institution.substring(0, 5)}%`), // Partial organ name
      eq(publicEditais.year, metadata.year)
    )
  });

  if (potentialMatches.length > 0) {
    // Look for Role/Acronym matches (e.g., CFAQ)
    const roleUpper = metadata.role.toUpperCase();
    const contestUpper = metadata.contestName.toUpperCase();
    
    const exactMatch = potentialMatches.find(m => {
        const mRole = m.role.toUpperCase();
        const mSlug = m.slugName.toUpperCase();
        
        // If the acronym (like CFAQ) is present in both, it's likely a duplicate
        const acronyms = ["CFAQ", "CAAQ", "PF", "PRF", "INSS", "OAB", "RECEITA"];
        for (const acro of acronyms) {
            if ((roleUpper.includes(acro) || contestUpper.includes(acro)) && (mRole.includes(acro) || mSlug.includes(acro))) {
                return true;
            }
        }
        
        // Or if roles are very similar
        return mRole.includes(roleUpper) || roleUpper.includes(mRole);
    });

    if (exactMatch) return exactMatch.id;
  }

  return null;
}

/**
 * Fetches the structure of a public edital for UI preview.
 */
export async function getPublicEditalStructure(publicEditalId: string): Promise<ActionResponse<{ subjects: string[], editalItems: any[] }>> {
  try {
    const publicEdital = await db.query.publicEditais.findFirst({
      where: eq(publicEditais.id, publicEditalId),
      with: {
        subjects: {
          with: {
            topics: true
          }
        }
      }
    });

    if (!publicEdital) return actionError("Edital público não encontrado");

    const subjects = publicEdital.subjects.map(s => s.name);
    const editalItems = publicEdital.subjects.flatMap(s => s.topics.map(t => ({
      category: s.name,
      topic: t.name,
      weight: 1
    })));

    return actionSuccess({ subjects, editalItems });
  } catch (error: any) {
    return actionError(error.message);
  }
}

/**
 * Phase 4: Full Parsing & Public Indexing
 */
export async function parseAndIndexEdital(benchId: string, fullText: string, metadata: { institution: string, role: string, year: string, contestName: string }, fileHash: string): Promise<ActionResponse<void>> {
  try {
    const prompt = `Você é um Analista Acadêmico especializado em extração de dados estruturados.
    Sua missão é mapear a hierarquia do conteúdo programático do edital fornecido.
    Retorne APENAS um JSON válido no seguinte formato:
    {
      "markdown": "Todo o conteúdo do edital convertido para Markdown limpo.",
      "subjects": [
        {
          "name": "Nome da Disciplina",
          "topics": ["Tópico 1", "Tópico 2"]
        }
      ]
    }`;

    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ 
        role: "user", 
        parts: [{ text: `TEXTO DO EDITAL:\n\n${fullText.substring(0, 100000)}` }] 
      }],
      config: {
        systemInstruction: { parts: [{ text: prompt }] },
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text.replace(/```json/g, "").replace(/```/g, "").trim());
    
    // Create a robust slug from contestName or composite
    const baseForSlug = metadata.contestName || `${metadata.institution} ${metadata.role} ${metadata.year}`;
    const slugName = baseForSlug.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

    await db.transaction(async (tx) => {
      // 1. Create Public Edital record
      const [pEdital] = await tx.insert(publicEditais).values({
        slugName,
        contestName: metadata.contestName,
        institution: metadata.institution,
        role: metadata.role,
        year: metadata.year,
        fileHash
      }).returning();

      // 2. Index Globally and Clone Privately in a unified way
      for (const sub of parsed.subjects) {
        // A. Public Indexing
        const [pSub] = await tx.insert(publicSubjects).values({
          publicEditalId: pEdital.id,
          name: sub.name
        }).returning();

        for (const top of sub.topics) {
          await tx.insert(publicTopics).values({
            publicSubjectId: pSub.id,
            name: top
          });
        }

        // B. Private Cloning for the current user
        const [newSub] = await tx.insert(subjects).values({
          benchId,
          title: sub.name,
          priority: 3,
          colorTag: "#3b82f6",
          icon: "Folder"
        }).returning();

        for (const top of sub.topics) {
          await tx.insert(editalItems).values({
            benchId,
            category: sub.name,
            topic: top,
            weight: 1
          });
        }
      }

      // 3. Update User Bench with Markdown and Link
      await tx.update(studyBenches)
        .set({ 
          examNotice: parsed.markdown,
          publicEditalId: pEdital.id,
          goalName: metadata.contestName || `${metadata.institution} - ${metadata.role} (${metadata.year})`,
          hasDiscoveredTopics: true,
          researchStatus: "idle"
        })
        .where(eq(studyBenches.id, benchId));

      // 4. Create "Edital Oficial" material for RAG
      const [editalMaterial] = await tx.insert(materials).values({
        benchId,
        title: "Edital Oficial",
        type: "text",
        content: parsed.markdown,
      }).returning();

      const { chunkMarkdown, getEmbedding, classifyChunk } = await import("@/lib/ai-optimizations");
      const chunks = chunkMarkdown(parsed.markdown);
      
      for (const chunk of chunks) {
        const [embedding, originTag] = await Promise.all([
          getEmbedding(chunk),
          classifyChunk(chunk)
        ]);

        if (embedding) {
          await tx.insert(materialChunks).values({
            materialId: editalMaterial.id,
            content: chunk,
            embedding,
            originTag
          });
        }
      }
    });

    revalidatePath(`/dashboard/bancadas/${benchId}`);
    return actionSuccess(undefined, "Edital processado e indexado com sucesso!");
  } catch (error: any) {
    console.error("Erro ao processar e indexar edital:", error);
    return actionError(error.message);
  }
}
