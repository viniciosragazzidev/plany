'use server'

import { db } from "@/lib/db";
import { studyBenches, editalItems, materials, subjects, webSources, materialChunks, quizzes, publicEditais } from "@/lib/db/schema";
import { eq, sql, and, desc, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { generateSearchQueries, QueryGenInput, researchEmptyEditalTopics, beautifyMaterialTitle } from "@/lib/web-research";
import { htmlToMarkdown } from "@/lib/markdown-converter";
import { scrapeSearchResults, calculateAuthorityScore } from "@/lib/web-scraper";
import { generateAIContent } from "@/lib/ai-service";
import { ActionResponse, actionError, actionSuccess, IdSchema } from "./types";
import { createNotification } from "./notifications";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { extractStructuredText } from "@/lib/pdf-extractor";
import {
  analyzeEditalMetadata,
  checkExistingEdital,
  selectPublicEdital,
  parseAndIndexEdital
} from "./public-edital";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { tokenizer } from "../services/infrastructure";


export async function processEditalPDF(formData: FormData): Promise<ActionResponse<{ topicCount: number }>> {
  const file = formData.get("file") as File;
  const benchId = formData.get("benchId") as string;

  if (!file || !benchId) {
    return actionError("Arquivo ou ID da bancada ausente");
  }

  try {
    console.log("[processEditalPDF] Iniciando novo fluxo de Garimpo...");
    const t0 = Date.now();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calculate File Hash for deduplication
    const fileHash = crypto.createHash('md5').update(buffer).digest('hex');

    console.log("[processEditalPDF] Extraindo texto estruturado localmente...");
    const structuredText = await extractStructuredText(buffer);

    // TOKENIZER INTEGRATION
    console.log("[processEditalPDF] Tokenizando texto...");
    const chunks = await tokenizer(structuredText);
    console.log(`[processEditalPDF] Texto fatiado em ${chunks.length} blocos.`);

    // DEBUG: Write to file at root
    try {
      const debugFilePath = path.join(process.cwd(), "debug_tokenized_text.txt");
      const debugContent = chunks.map((c, i) => `--- BLOCk ${i + 1} (${c.estimatedTokens} tokens) ---\n${c.content}\n`).join("\n\n");
      fs.writeFileSync(debugFilePath, debugContent);
      console.log(`[processEditalPDF] DEBUG: Texto tokenizado salvo em ${debugFilePath}`);
    } catch (debugErr) {
      console.error("[processEditalPDF] Falha ao salvar arquivo de debug:", debugErr);
    }

    // Use the first chunk (header) for metadata extraction - it's usually enough and faster
    const headerContext = chunks[0]?.content || structuredText.substring(0, 8000);

    // Phase 2: AI Metadata Extraction (Lightweight)
    console.log("[processEditalPDF] Phase 2: Extraindo metadados...");
    const metadataRes = await analyzeEditalMetadata(headerContext);
    if (!metadataRes.success || !metadataRes.data) {
      throw new Error(metadataRes.error || "Falha ao extrair metadados do edital");
    }
    const metadata = metadataRes.data;

    // Phase 3: Secondary Deduplication Check
    console.log("[processEditalPDF] Phase 3: Checando duplicatas...");
    const existingId = await checkExistingEdital(metadata);

    if (existingId) {
      console.log("[processEditalPDF] Cache Hit! Vinculando edital existente...");
      const selectRes = await selectPublicEdital(benchId, existingId);
      if (!selectRes.success) throw new Error(selectRes.error);

      return actionSuccess({ topicCount: 0 }, "Edital encontrado na biblioteca e vinculado com sucesso!");
    }

    // Phase 4: Full Parsing & Public Indexing
    console.log("[processEditalPDF] Phase 4: Parsing completo e indexação pública...");
    // For full parsing, if the file is massive, we might need a multi-chunk strategy, 
    // but for now, we'll pass the full text as the prompt handles up to 100k chars.
    const indexRes = await parseAndIndexEdital(benchId, structuredText, metadata, fileHash);
    if (!indexRes.success) throw new Error(indexRes.error);

    console.log(`[processEditalPDF] Fluxo concluído em ${Date.now() - t0}ms`);
    revalidatePath(`/dashboard/bancadas/${benchId}`);
    return actionSuccess({ topicCount: 0 }, "Edital processado, indexado e vinculado!");
  } catch (error: any) {
    console.error("Erro no fluxo de Garimpo:", error);
    return actionError(error.message);
  }
}

export async function extractBenchDataFromEdital(formData: FormData) {
  const file = formData.get("file") as File;

  if (!file) {
    return { success: false, error: "Arquivo ausente" };
  }

  try {
    console.log("[extractBenchDataFromEdital] Iniciando extração nativa...");
    const t0 = Date.now();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calculate File Hash for deduplication
    const fileHash = crypto.createHash('md5').update(buffer).digest('hex');

    console.log("[extractBenchDataFromEdital] Extraindo texto estruturado localmente via pdfjs-dist...");
    const tExtract = Date.now();
    const structuredText = await extractStructuredText(buffer);
    console.log(`[extractBenchDataFromEdital] Texto extraído localmente em ${Date.now() - tExtract}ms`);

    // TOKENIZER INTEGRATION
    console.log("[extractBenchDataFromEdital] Tokenizando texto...");
    const chunks = await tokenizer(structuredText);
    console.log(`[extractBenchDataFromEdital] Texto fatiado em ${chunks.length} blocos.`);

    // DEBUG: Write to file at root
    try {
      const debugFilePath = path.join(process.cwd(), "debug_tokenized_text_onboarding.txt");
      const debugContent = chunks.map((c, i) => `--- BLOCk ${i + 1} (${c.estimatedTokens} tokens) ---\n${c.content}\n`).join("\n\n");
      fs.writeFileSync(debugFilePath, debugContent);
      console.log(`[extractBenchDataFromEdital] DEBUG: Texto tokenizado salvo em ${debugFilePath}`);
    } catch (debugErr) {
      console.error("[extractBenchDataFromEdital] Falha ao salvar arquivo de debug:", debugErr);
    }

    // Use the first chunk (header) for metadata extraction - it's usually enough and faster
    const headerContext = chunks[0]?.content || structuredText.substring(0, 8000);

    // Phase 2: Metadata Extraction (Lightweight)
    console.log("[extractBenchDataFromEdital] Phase 2: Extraindo metadados...");
    const metadataRes = await analyzeEditalMetadata(headerContext);
    if (!metadataRes.success || !metadataRes.data) {
      throw new Error(metadataRes.error || "Falha ao extrair metadados do edital");
    }
    const metadata = metadataRes.data;

    // Phase 3: Secondary Deduplication Check
    console.log("[extractBenchDataFromEdital] Phase 3: Checando duplicatas...");
    const existingEdital = await db.query.publicEditais.findFirst({
      where: and(
        ilike(publicEditais.institution, metadata.institution),
        ilike(publicEditais.role, metadata.role),
        eq(publicEditais.year, metadata.year)
      ),
      with: {
        subjects: {
          with: {
            topics: true
          }
        }
      }
    });

    if (existingEdital) {
      console.log("[extractBenchDataFromEdital] Cache Hit! Retornando dados públicos...");
      const subjects = existingEdital.subjects.map(s => s.name);
      const items = existingEdital.subjects.flatMap(s => s.topics.map(t => ({
        category: s.name,
        topic: t.name,
        weight: 1
      })));

      return {
        success: true,
        data: {
          publicEditalId: existingEdital.id,
          goalName: `${existingEdital.institution} - ${existingEdital.role}`,
          examBoard: existingEdital.institution,
          targetDate: undefined,
          weeklyHours: 20,
          subjects,
          editalItems: items,
          examNotice: "" // Markdown not stored in publicEdital currently, user will get it from private if they create
        }
      };
    }

    // Phase 4: Full Parsing for NEW Edital
    console.log("[extractBenchDataFromEdital] Phase 4: Parsing completo para novo edital...");
    const extractSystemPrompt = `Você é um Analista Acadêmico especializado em extração de dados estruturados.
    Sua missão é extrair o CONTEÚDO PROGRAMÁTICO e METADADOS do texto estruturado do edital fornecido para configurar um plano de estudos.
    Você também deve converter o texto do edital para um Markdown estruturado de alta qualidade.
    
    Retorne APENAS um JSON válido no seguinte formato:
    {
      "markdown": "Todo o conteúdo do edital convertido para Markdown limpo e estruturado.",
      "subjects": ["Disciplina 1", "Disciplina 2"],
      "items": [
        { "category": "Nome da Disciplina", "topic": "Nome do Tópico", "description": "Breve detalhamento", "weight": 1-5 }
      ]
    }`;

    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          { text: `TEXTO DO EDITAL:\n\n${structuredText.substring(0, 100000)}` }
        ]
      }],
      forceCloud: true,
      config: {
        systemInstruction: { parts: [{ text: extractSystemPrompt }] },
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("A IA não retornou uma resposta válida.");

    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(jsonStr);

    console.log(`[extractBenchDataFromEdital] Tempo TOTAL: ${Date.now() - t0}ms`);
    return {
      success: true,
      data: {
        publicEditalId: null,
        goalName: metadata.contestName || `${metadata.institution} - ${metadata.role}`,
        examBoard: metadata.institution,
        targetDate: undefined,
        weeklyHours: 20,
        subjects: parsedData.subjects || [],
        editalItems: parsedData.items || [],
        examNotice: parsedData.markdown,
        // Carry forward metadata for final indexing
        rawMetadata: metadata,
        fileHash
      }
    };
  } catch (error: any) {
    console.error("Erro ao extrair dados do Edital:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteStudyBench(benchId: string) {
  try {
    await db.transaction(async (tx) => {
      // Delete related items first to avoid foreign key constraint violations
      await tx.delete(quizzes).where(eq(quizzes.benchId, benchId));
      await tx.delete(webSources).where(eq(webSources.benchId, benchId));
      await tx.delete(materials).where(eq(materials.benchId, benchId));
      await tx.delete(editalItems).where(eq(editalItems.benchId, benchId));
      await tx.delete(subjects).where(eq(subjects.benchId, benchId));
      await tx.delete(studyBenches).where(eq(studyBenches.id, benchId));
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir bancada:", error);
    return { success: false, error: error.message };
  }
}

export async function addMaterial(formData: FormData): Promise<ActionResponse<{ materialId: string }>> {
  const benchId = formData.get("benchId") as string;
  let subjectId = formData.get("subjectId") as string | null;
  const editalItemId = formData.get("editalItemId") as string | null;
  const title = formData.get("title") as string;
  const type = formData.get("type") as "pdf" | "link" | "text" | "anotacao" | "simulado" | "flashcard";
  const file = formData.get("file") as File | null;
  const url = formData.get("url") as string | null;
  const textContent = formData.get("content") as string | null;
  const isPinned = formData.get("isPinned") === "true";

  if (!benchId || !title || !type) {
    return actionError("Informações incompletas");
  }

  try {
    let content = textContent || "";
    const storageUrl = url || "";

    if (type === "pdf" && file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const structuredText = await extractStructuredText(buffer);

      // Convert Structured Text to MD and Suggest Subject
      const existingSubjects = await db.query.subjects.findMany({
        where: eq(subjects.benchId, benchId)
      });
      const subjectsContext = existingSubjects.map(s => s.title).join(", ");

      const mdSystemPrompt = `Você é um Analista Acadêmico especializado em conversão de materiais de estudo e classificação.
      Sua missão é:
      1. Converter o texto estruturado do arquivo em Markdown de alta qualidade.
      2. Sugerir a qual destas disciplinas o material pertence: [${subjectsContext}]. 
         Se não encontrar uma correspondência clara, sugira "Outros".
      
      Retorne APENAS um JSON no formato:
      {
        "content": "Markdown extraído do texto...",
        "suggestedSubject": "Título da Disciplina"
      }`;

      const mdResponse = await generateAIContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [
            { text: `TEXTO ESTRUTURADO PARA CONVERTER:\n\n${structuredText.substring(0, 100000)}` }
          ]
        }],
        forceCloud: true,
        config: {
          systemInstruction: { parts: [{ text: mdSystemPrompt }] },
          responseMimeType: "application/json"
        }
      });

      const resultText = mdResponse.text || "{}";
      try {
        const jsonStr = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(jsonStr);
        content = parsed.content || "";

        // If subjectId wasn't provided, try to find the suggested one
        if (!subjectId && parsed.suggestedSubject) {
          const matched = existingSubjects.find(s => s.title.toLowerCase() === parsed.suggestedSubject.toLowerCase());
          if (matched) {
            subjectId = matched.id;
          }
        }
      } catch (e) {
        content = resultText;
      }
    }

    const [material] = await db.insert(materials).values({
      benchId,
      subjectId: subjectId || null,
      editalItemId: editalItemId || null,
      title,
      type,
      storageUrl,
      content,
      isPinned,
    }).returning();

    // STEP: Surgical RAG - Chunking and Vectorization
    if (content && content.trim().length > 0) {
      const { chunkMarkdown, getEmbedding, classifyChunk } = await import("@/lib/ai-optimizations");
      const chunks = chunkMarkdown(content);

      // Process chunks in parallel batches to speed up ingestion
      const batchSize = 5;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        await Promise.all(batch.map(async (chunk) => {
          try {
            const [embedding, originTag] = await Promise.all([
              getEmbedding(chunk),
              classifyChunk(chunk)
            ]);

            if (embedding) {
              await db.insert(materialChunks).values({
                materialId: material.id,
                content: chunk,
                embedding,
                subjectId: material.subjectId,
                topicId: material.editalItemId,
                originTag
              });
            }
          } catch (err) {
            console.error(`Erro ao vetorizar chunk do material ${material.id}:`, err);
          }
        }));
      }
    }

    revalidatePath(`/dashboard/bancadas/${benchId}`);
    revalidatePath("/dashboard");
    return actionSuccess({ materialId: material.id }, "Material adicionado com sucesso");
  } catch (error: any) {
    console.error("Erro ao adicionar material:", error);
    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("spending cap")) {
      return actionError("Sua chave API do Gemini excedeu a cota de uso ou limite financeiro. Por favor, gerencie seus limites no Google AI Studio.");
    }
    return actionError(error.message || "Erro ao adicionar material");
  }
}

export async function deleteTopic(topicId: string) {
  try {
    const [item] = await db.delete(editalItems)
      .where(eq(editalItems.id, topicId))
      .returning();

    if (item) {
      revalidatePath(`/dashboard/bancadas/${item.benchId}`);
    }
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir tópico:", error);
    return { success: false, error: error.message };
  }
}

export async function createTopic(data: { benchId: string; category: string; topic: string; description?: string; weight?: number }) {
  try {
    const [item] = await db.insert(editalItems).values({
      benchId: data.benchId,
      category: data.category,
      topic: data.topic,
      description: data.description || "",
      weight: data.weight || 1,
    }).returning();

    revalidatePath(`/dashboard/bancadas/${data.benchId}`);
    return { success: true, item };
  } catch (error: any) {
    console.error("Erro ao criar tópico:", error);
    return { success: false, error: error.message };
  }
}

export async function createSubject(data: { benchId: string; title: string; colorTag: string; icon?: string; priority?: number }): Promise<ActionResponse<any>> {
  try {
    const [subject] = await db.insert(subjects).values({
      benchId: data.benchId,
      title: data.title,
      colorTag: data.colorTag,
      icon: data.icon || "Folder",
      priority: data.priority || 3,
    }).returning();

    revalidatePath(`/dashboard/bancadas/${data.benchId}`);
    revalidatePath("/dashboard");
    return actionSuccess(subject, "Disciplina criada com sucesso");
  } catch (error: any) {
    console.error("Erro ao criar disciplina:", error);
    return actionError(error.message || "Erro ao criar disciplina");
  }
}

export async function updateSubject(subjectId: string, data: { title?: string; colorTag?: string; icon?: string; priority?: number }): Promise<ActionResponse<any>> {
  try {
    const [subject] = await db.update(subjects)
      .set(data)
      .where(eq(subjects.id, subjectId))
      .returning();

    revalidatePath(`/dashboard/bancadas/${subject.benchId}`);
    revalidatePath("/dashboard");
    return actionSuccess(subject, "Disciplina atualizada com sucesso");
  } catch (error: any) {
    console.error("Erro ao atualizar disciplina:", error);
    return actionError(error.message || "Erro ao atualizar disciplina");
  }
}

export async function getContextualNotes(
  subjectId: string,
  topicId: string | null,
  query: string,
  limit: number = 5
) {
  try {
    const { getEmbedding } = await import("@/lib/ai-optimizations");
    const queryEmbedding = await getEmbedding(query);

    if (!queryEmbedding) return { success: false, chunks: [] };

    const similarity = sql<number>`1 - (${materialChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`;

    const conditions = [eq(materialChunks.subjectId, subjectId)];
    if (topicId) {
      conditions.push(eq(materialChunks.topicId, topicId));
    }

    const results = await db
      .select({
        id: materialChunks.id,
        content: materialChunks.content,
        originTag: materialChunks.originTag,
        similarity
      })
      .from(materialChunks)
      .where(and(...conditions))
      .orderBy((t) => desc(t.similarity))
      .limit(limit);

    return { success: true, chunks: results };
  } catch (error: any) {
    console.error("Erro ao buscar notas contextuais:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteSubject(subjectId: string): Promise<ActionResponse<null>> {
  const validation = IdSchema.safeParse(subjectId);
  if (!validation.success) return actionError("ID inválido");

  try {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));
    if (!subject) return actionError("Disciplina não encontrada");

    await db.transaction(async (tx) => {
      await tx.delete(quizzes).where(eq(quizzes.subjectId, subjectId));
      await tx.delete(materials).where(eq(materials.subjectId, subjectId));
      await tx.delete(subjects).where(eq(subjects.id, subjectId));
    });

    revalidatePath(`/dashboard/bancadas/${subject.benchId}`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/cadernos");
    return actionSuccess(null, "Disciplina excluída com sucesso");
  } catch (error: any) {
    console.error("Erro ao excluir disciplina:", error);
    return actionError(error.message || "Erro ao excluir disciplina");
  }
}

export async function moveMaterial(materialId: string, targetSubjectId: string) {
  try {
    const [material] = await db.update(materials)
      .set({ subjectId: targetSubjectId })
      .where(eq(materials.id, materialId))
      .returning();

    revalidatePath(`/dashboard/bancadas/${material.benchId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao mover material:", error);
    return { success: false, error: error.message };
  }
}

export async function togglePinMaterial(materialId: string, isPinned: boolean) {
  try {
    const [material] = await db.update(materials)
      .set({ isPinned })
      .where(eq(materials.id, materialId))
      .returning();

    revalidatePath(`/dashboard/bancadas/${material.benchId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao fixar material:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteMaterial(materialId: string) {
  try {
    const [material] = await db.delete(materials)
      .where(eq(materials.id, materialId))
      .returning();

    revalidatePath(`/dashboard/bancadas/${material.benchId}`);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/cadernos");
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao excluir material:", error);
    return { success: false, error: error.message };
  }
}

export async function toggleTopicCompletion(itemId: string, isCovered: boolean) {
  try {
    const [item] = await db.update(editalItems)
      .set({ isCovered })
      .where(eq(editalItems.id, itemId))
      .returning();

    revalidatePath(`/dashboard/bancadas/${item.benchId}`);
    revalidatePath("/dashboard");
    return { success: true, isCovered: item.isCovered };
  } catch (error: any) {
    console.error("Erro ao alternar conclusão do tópico:", error);
    return { success: false, error: error.message };
  }
}

export async function updateExamNotice(benchId: string, content: string) {
  await db
    .update(studyBenches)
    .set({ examNotice: content })
    .where(eq(studyBenches.id, benchId));

  revalidatePath(`/dashboard/bancadas/${benchId}`);
}

export async function performWebResearch(
  benchId: string,
  selectedSubjectIds?: string[],
  targetCount: number = 3,
  specificTopics?: string[]
) {
  try {
    // ... (session check)
    let session;
    try {
      const currentHeaders = await headers();
      session = await auth.api.getSession({
        headers: currentHeaders,
      });
    } catch (authError) {
      console.warn("[Auth] Falha ao recuperar sessão via headers:", authError);
    }

    // Fetch bench and edital content
    const bench = await db.query.studyBenches.findFirst({
      where: eq(studyBenches.id, benchId),
    });

    if (!bench) {
      return { success: false, error: "Bancada não encontrada" };
    }

    // Set status to researching
    await db.update(studyBenches)
      .set({ researchStatus: "researching" })
      .where(eq(studyBenches.id, benchId));

    // Get topics from edital strictly filtered by selected subjects or specificTopics
    let topics: string[] = [];

    if (specificTopics && specificTopics.length > 0) {
      // Use specifically selected topics (max precision)
      topics = specificTopics;
    } else if (selectedSubjectIds && selectedSubjectIds.length > 0) {
      // 1. Fetch the titles of the selected subjects
      const selectedSubjects = await db.query.subjects.findMany({
        where: (subjects, { and, eq, inArray }) =>
          and(
            eq(subjects.benchId, benchId),
            inArray(subjects.id, selectedSubjectIds)
          )
      });

      const subjectTitles = selectedSubjects.map(s => s.title.toLowerCase());

      // 2. Fetch all edital items for this bench
      const editalItemsList = await db.query.editalItems.findMany({
        where: eq(editalItems.benchId, benchId),
      });

      // 3. Filter edital items that match the selected subject categories
      const filteredEditalItems = editalItemsList.filter(item =>
        subjectTitles.some(title =>
          item.category.toLowerCase().includes(title) ||
          title.includes(item.category.toLowerCase())
        )
      );

      topics = [
        ...new Set(
          filteredEditalItems.map((item) => `${item.category}: ${item.topic}`)
        ),
      ];
    }

    if (topics.length === 0) {
      return {
        success: false,
        error: "Nenhum assunto selecionado no contexto, ou o edital não pôde ser interpretado. Ative os switches das matérias que deseja pesquisar.",
      };
    }

    // Limit to a reasonable number of topics per request to avoid overloading
    const limitedTopics = topics.slice(0, 5);
    const results: any[] = [];

    // Generate queries for each topic
    const queryInput: QueryGenInput = {
      materia: bench.goalName,
      topicos: limitedTopics,
      editalContent: bench.examNotice || undefined,
    };

    const queryResults = await generateSearchQueries(queryInput);

    // Phase: Web Scraping with Parallelism
    // We process each topic's query sets in parallel to save time
    await Promise.all(queryResults.map(async (querySet) => {
      // Process queries for this specific topic
      // We limit to 2 queries per topic to avoid overwhelming network/quota
      const limitedQueries = querySet.queries.slice(0, 2);
      
      for (const query of limitedQueries) {
        try {
          const scrapedResults = await scrapeSearchResults(
            query,
            querySet.topic,
            targetCount
          );

          // Phase: Process Scraped Results in parallel
          await Promise.all(scrapedResults.map(async (scraped) => {
            if (results.length >= targetCount * queryResults.length) return;

            let markdown = "";
            let wordCount = 0;

            if (scraped.markdownContent) {
              markdown = scraped.markdownContent;
              wordCount = markdown.split(/\s+/).length;
            } else {
              const conversionResult = await htmlToMarkdown(scraped.htmlContent, scraped.title);
              if (!conversionResult.isValid) return;
              markdown = conversionResult.markdown;
              wordCount = conversionResult.wordCount;
            }

            const authorityScore = calculateAuthorityScore(scraped.domain, markdown);
            if (authorityScore < 40) return;

            // AI BEAUTIFY TITLE: Parallelized
            const cleanTitle = await beautifyMaterialTitle(scraped.title, querySet.topic);

            // Save to web_sources
            const [webSource] = await db
              .insert(webSources)
              .values({
                benchId: bench.id as any,
                title: cleanTitle,
                sourceUrl: scraped.sourceUrl,
                htmlContent: scraped.htmlContent,
                markdownContent: markdown,
                category: bench.goalName,
                topic: querySet.topic,
                authorityScore,
                status: "converted",
              })
              .returning();

            if (webSource) {
              results.push({
                id: webSource.id,
                title: cleanTitle,
                sourceUrl: scraped.sourceUrl,
                topic: querySet.topic,
                authorityScore,
                markdownLength: wordCount,
              });
            }
          }));
        } catch (error) {
          console.error(`Erro ao processar query "${query}":`, error);
        }
      }
    }));

    if (results.length > 0 && session?.user?.id) {
      await createNotification({
        userId: session.user.id,
        title: "Garimpo Concluído!",
        message: `Encontramos ${results.length} novos materiais para sua jornada em "${bench.goalName}".`,
        type: "success",
        link: `/dashboard/bancadas/${benchId}`,
      });
    }

    await db.update(studyBenches)
      .set({ researchStatus: "idle" })
      .where(eq(studyBenches.id, benchId));

    revalidatePath(`/dashboard/bancadas/${benchId}`);
    return {
      success: true,
      count: results.length,
      results: results.sort((a, b) => b.authorityScore - a.authorityScore),
      message: `Encontrados ${results.length} materiais de alta qualidade!`,
    };
  } catch (error: any) {
    console.error("Erro na pesquisa web:", error);

    await db.update(studyBenches)
      .set({ researchStatus: "idle" })
      .where(eq(studyBenches.id, benchId));

    return { success: false, error: error.message || "Erro ao realizar pesquisa web" };
  }
}

export async function importWebMaterials(webSourceIds: string[]) {
  if (!webSourceIds || webSourceIds.length === 0) {
    return { success: false, error: "Nenhum material selecionado" };
  }

  try {
    // Fetch specifically requested web sources that are converted
    const sourcesToImport = await db.query.webSources.findMany({
      where: (ws, { and, inArray, eq }) =>
        and(
          inArray(ws.id, webSourceIds),
          eq(ws.status, "converted")
        )
    });

    if (sourcesToImport.length === 0) {
      return { success: false, error: "Nenhuma fonte encontrada para importar ou já importada." };
    }

    const importedMaterials = [];
    const benchId = sourcesToImport[0].benchId as string;

    // Prefetch subjects and edital items for mapping
    const benchSubjects = await db.query.subjects.findMany({
      where: eq(subjects.benchId, benchId),
    });

    const benchEditalItems = await db.query.editalItems.findMany({
      where: eq(editalItems.benchId, benchId),
    });

    // Import each source as a material
    for (const source of sourcesToImport) {
      try {
        let subjectId: string | null = null;
        let editalItemId: string | null = null;

        // --- ENHANCED MATCHING LOGIC ---
        // Helper to normalize strings (remove numbering like '1.', '1.1', extra spaces)
        const normalize = (s: string) => s.toLowerCase()
          .replace(/^[\d\.]+\s+/, "") // Remove numbering
          .replace(/[^\w\sÀ-ú]/gi, "") // Remove special characters
          .trim();

        // source.topic is usually "Category: Topic Name"
        const topicParts = source.topic.split(": ");
        const categoryPartNormalized = normalize(topicParts[0]);
        const topicPartNormalized = normalize(topicParts[1] || source.topic);

        // 1. Try to find the exact edital item with enhanced normalization
        const matchedItem = benchEditalItems.find(item => {
          const itemCatNorm = normalize(item.category);
          const itemTopNorm = normalize(item.topic);

          // Tiered matching strategy
          return (itemCatNorm === categoryPartNormalized && itemTopNorm === topicPartNormalized) ||
                 (itemTopNorm === topicPartNormalized) ||
                 (topicPartNormalized.length > 5 && itemTopNorm.includes(topicPartNormalized)) ||
                 (itemTopNorm.length > 5 && topicPartNormalized.includes(itemTopNorm));
        });

        if (matchedItem) {
          console.log(`[Import] Matched topic: "${source.topic}" -> ${matchedItem.topic} (ID: ${matchedItem.id})`);
          editalItemId = matchedItem.id;
          
          // Map subject from matched item
          const matchedSubject = benchSubjects.find(s => 
            normalize(s.title) === normalize(matchedItem.category) ||
            normalize(matchedItem.category).includes(normalize(s.title))
          );
          if (matchedSubject) subjectId = matchedSubject.id;
        }

        // 2. Fallback: If no item matched, at least try to match the subject precisely
        if (!subjectId) {
          const matchedSubject = benchSubjects.find(s => 
            categoryPartNormalized === normalize(s.title) ||
            categoryPartNormalized.includes(normalize(s.title)) || 
            normalize(s.title).includes(categoryPartNormalized)
          );
          if (matchedSubject) subjectId = matchedSubject.id;
        }

        if (!editalItemId) {
          console.warn(`[Import] No topic match for: "${source.topic}". Falling back to subject: ${subjectId || 'None'}`);
        }

        const [material] = await db
          .insert(materials)
          .values({
            benchId,
            subjectId,
            editalItemId,
            title: source.title,
            type: "link",
            storageUrl: source.sourceUrl,
            content: source.markdownContent,
            isPinned: false,
            contentVectorRef: `web_source_${source.id}`,
          })
          .returning();

        // STEP: Surgical RAG - Chunking and Vectorization
        if (source.markdownContent) {
          const { chunkMarkdown, getEmbedding, classifyChunk } = await import("@/lib/ai-optimizations");
          const chunks = chunkMarkdown(source.markdownContent);
          
          // Process chunks in parallel batches to speed up ingestion
          const batchSize = 5;
          for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            await Promise.all(batch.map(async (chunk) => {
              try {
                const [embedding, originTag] = await Promise.all([
                  getEmbedding(chunk),
                  classifyChunk(chunk)
                ]);

                if (embedding) {
                  await db.insert(materialChunks).values({
                    materialId: material.id,
                    content: chunk,
                    embedding,
                    subjectId: material.subjectId,
                    topicId: material.editalItemId,
                    originTag
                  });
                }
              } catch (err) {
                console.error(`Erro ao vetorizar chunk do material importado ${material.id}:`, err);
              }
            }));
          }
        }

        // Update web source status
        await db
          .update(webSources)
          .set({ status: "imported" })
          .where(eq(webSources.id, source.id as any));

        importedMaterials.push({
          id: material.id,
          title: source.title,
          source: source.sourceUrl,
        });
      } catch (error) {
        console.error(`Erro ao importar material ${source.title}:`, error);
        continue;
      }
    }

    revalidatePath(`/dashboard/bancadas/${benchId}`);
    return {
      success: true,
      importedCount: importedMaterials.length,
      materialIds: importedMaterials.map((m) => m.id),
      message: `Ouro encontrado! ${importedMaterials.length} novos materiais integrados à sua bancada.`,
    };
  } catch (error: any) {
    console.error("Erro ao importar materiais web:", error);
    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("spending cap")) {
      return {
        success: false,
        error: "Sua chave API do Gemini excedeu a cota de uso ou limite financeiro. Por favor, gerencie seus limites no Google AI Studio.",
      };
    }
    return {
      success: false,
      error: error.message || "Erro ao importar materiais",
    };
  }
}
