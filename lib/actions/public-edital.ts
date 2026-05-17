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
      // Use contest name for goalName if available, otherwise format from institution/role
      // For legacy records, we'll try to reconstruct a pretty name from the slug
      const prettyName = publicEdital.slugName.split('-').join(' ');

      // 1. Update bench metadata
      await tx.update(studyBenches)
        .set({
          goalName: prettyName,
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
    const prompt = `Analyze the provided exam text header. 
    Identify:
    1. The Governing Institution (e.g., Marinha do Brasil, INSS).
    2. The Specific Contest Name/Acronym (e.g., CFAQ-MOC, CAAQ-CTS, Concurso Público).
    3. The Target Roles (e.g., Moço de Convés, Agente Administrativo).
    4. The Year.

    Output strictly a RAW JSON format: 
    { 
      "institution": "Full Institution Name", 
      "role": "Specific Roles or Acronym", 
      "year": "YYYY",
      "contestName": "Specific Name of the Contest (e.g. Processo Seletivo CFAQ 2026)"
    } 
    Do not extract subjects yet.`;

    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ 
        role: "user", 
        parts: [{ text: `HEADER TEXT:\n\n${text.substring(0, 5000)}` }] 
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
 */
export async function checkExistingEdital(metadata: { institution: string, role: string, year: string }): Promise<string | null> {
  const match = await db.query.publicEditais.findFirst({
    where: and(
      ilike(publicEditais.institution, metadata.institution),
      ilike(publicEditais.role, metadata.role),
      eq(publicEditais.year, metadata.year)
    )
  });
  return match?.id || null;
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
      // 1. Create Public Edital
      const [pEdital] = await tx.insert(publicEditais).values({
        slugName,
        institution: metadata.institution,
        role: metadata.role,
        year: metadata.year,
        fileHash
      }).returning();

      // 2. Index Subjects and Topics Publicly
      for (const sub of parsed.subjects) {
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
      }

      // 3. Update User Bench with Markdown
      await tx.update(studyBenches)
        .set({ 
          examNotice: parsed.markdown,
          publicEditalId: pEdital.id,
          goalName: metadata.contestName || `${metadata.institution} - ${metadata.role} (${metadata.year})`,
          hasDiscoveredTopics: true
        })
        .where(eq(studyBenches.id, benchId));

      // 4. Clone to User Private Space
      for (const sub of parsed.subjects) {
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

      // 5. Create "Edital Oficial" material for RAG
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
