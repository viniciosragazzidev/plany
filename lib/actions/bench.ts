'use server'

import { db } from "@/lib/db";
import { studyBenches, editalItems, materials, subjects, webSources, materialChunks } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
// @ts-expect-error: pdf-parse-fork lacks type definitions
import pdf from 'pdf-parse-fork';
import { GoogleGenAI } from "@google/genai";
import { generateSearchQueries, QueryGenInput } from "@/lib/web-research";
import { htmlToMarkdown } from "@/lib/markdown-converter";
import { scrapeSearchResults, calculateAuthorityScore } from "@/lib/web-scraper";
import { chunkMarkdown, getEmbedding } from "@/lib/ai-optimizations";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function processEditalPDF(formData: FormData) {
  const file = formData.get("file") as File;
  const benchId = formData.get("benchId") as string;

  if (!file || !benchId) {
    return { success: false, error: "Arquivo ou ID da bancada ausente" };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    const rawText = data.text;

    // STEP 3: Mandatory PDF-to-MD Conversion for RAG
    const mdSystemPrompt = `Você é um Analista Acadêmico especializado em conversão de documentos.
    Sua missão é converter o texto bruto de um edital em Markdown estruturado de alta qualidade.
    - Preserve headers (# para títulos principais, ## para sub-tópicos)
    - Formate tabelas de cronogramas e critérios de pontuação
    - Preserve listas de conteúdo programático
    - Remova ruídos de metadados do PDF (números de página soltos, cabeçalhos repetidos)
    - Retorne apenas o Markdown.`;

    const mdResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `TEXTO BRUTO PARA CONVERTER:\n${rawText.substring(0, 25000)}` }] }],
      config: {
        systemInstruction: {
          parts: [{ text: mdSystemPrompt }]
        }
      }
    });

    const editalMarkdown = mdResponse.text;
    if (!editalMarkdown) throw new Error("Falha na conversão para Markdown");

    // STEP 4: Extract structured topics from the Markdown + Metadata
    const extractSystemPrompt = `Você é um Analista Acadêmico especializado em extração de dados estruturados.
    Sua missão é extrair o CONTEÚDO PROGRAMÁTICO e METADADOS de editais em Markdown.
    
    Retorne APENAS um JSON válido no seguinte formato:
    {
      "metadata": {
        "goalName": "Nome do Concurso",
        "examBoard": "Banca (ex: FGV, CESPE, Vunesp)",
        "targetDate": "YYYY-MM-DD"
      },
      "items": [
        { "category": "Nome da Disciplina", "topic": "Nome do Tópico", "description": "Breve detalhamento se houver", "weight": 1-5 }
      ]
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `EDITAL EM MARKDOWN:\n${editalMarkdown}` }] }],
      config: {
        systemInstruction: {
          parts: [{ text: extractSystemPrompt }]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("A IA não retornou uma resposta válida.");
    
    // Clean JSON response
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const { metadata, items } = JSON.parse(jsonStr);

    // Save to database
    await db.transaction(async (tx) => {
      // 1. Update bench with the HIGH-QUALITY MARKDOWN and Metadata
      const currentBench = await tx.query.studyBenches.findFirst({
        where: eq(studyBenches.id, benchId)
      });

      await tx.update(studyBenches)
        .set({ 
          examNotice: editalMarkdown,
          goalName: currentBench?.goalName || metadata.goalName,
          examBoard: currentBench?.examBoard || metadata.examBoard,
          targetDate: currentBench?.targetDate || metadata.targetDate
        }) 
        .where(eq(studyBenches.id, benchId));

      // 3. Insert new items
      if (items && items.length > 0) {
        for (const item of items) {
          await tx.insert(editalItems).values({
            benchId,
            category: item.category,
            topic: item.topic,
            description: item.description,
            weight: item.weight || 1,
          });
        }
      }

      // STEP: Save Edital as a Vectorized Material for RAG
      const [editalMaterial] = await tx.insert(materials).values({
        benchId,
        title: "Edital Oficial",
        type: "text",
        content: editalMarkdown,
      }).returning();

      const chunks = chunkMarkdown(editalMarkdown);
      for (const chunk of chunks) {
        const embedding = await getEmbedding(chunk);
        await tx.insert(materialChunks).values({
          materialId: editalMaterial.id,
          content: chunk,
          embedding: embedding,
        });
      }
    });

    revalidatePath(`/dashboard/bancadas/${benchId}`);
    return { success: true, topicCount: items?.length || 0 };
  } catch (error: any) {
    console.error("Erro ao processar Edital:", error);
    return { success: false, error: error.message };
  }
}

export async function extractBenchDataFromEdital(formData: FormData) {
  const file = formData.get("file") as File;

  if (!file) {
    return { success: false, error: "Arquivo ausente" };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await pdf(buffer);
    const rawText = data.text;

    // STEP 1: Conversion to High-Quality Markdown for RAG/Consultant
    const mdSystemPrompt = `Você é um Analista Acadêmico especializado em conversão de documentos.
    Sua missão é converter o texto bruto de um edital em Markdown estruturado de alta qualidade.
    - Preserve headers (# para títulos principais, ## para sub-tópicos)
    - Formate tabelas de cronogramas e critérios de pontuação
    - Preserve listas de conteúdo programático
    - Remova ruídos de metadados do PDF
    - Retorne apenas o Markdown.`;

    const mdResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `TEXTO BRUTO PARA CONVERTER:\n${rawText.substring(0, 25000)}` }] }],
      config: {
        systemInstruction: {
          parts: [{ text: mdSystemPrompt }]
        }
      }
    });

    const editalMarkdown = mdResponse.text;
    if (!editalMarkdown) throw new Error("Falha na conversão para Markdown");

    // STEP 2: Extraction of Metadata AND Structured Topics
    const extractSystemPrompt = `Você é um Analista Acadêmico especializado em extração de dados estruturados.
    Sua missão é extrair o CONTEÚDO PROGRAMÁTICO e METADADOS de editais para configurar um plano de estudos.
    
    Retorne APENAS um JSON válido no seguinte formato:
    {
      "metadata": {
        "goalName": "Nome do Concurso",
        "examBoard": "Banca (ex: FGV, CESPE, Vunesp)",
        "targetDate": "YYYY-MM-DD",
        "weeklyHours": 20
      },
      "subjects": ["Disciplina 1", "Disciplina 2"],
      "items": [
        { "category": "Nome da Disciplina", "topic": "Nome do Tópico", "description": "Breve detalhamento", "weight": 1-5 }
      ]
    }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `EDITAL EM MARKDOWN:\n${editalMarkdown}` }] }],
      config: {
        systemInstruction: {
          parts: [{ text: extractSystemPrompt }]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("A IA não retornou uma resposta válida.");
    
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const { metadata, subjects, items } = JSON.parse(jsonStr);

    return { 
      success: true, 
      data: {
        goalName: metadata.goalName,
        examBoard: metadata.examBoard,
        targetDate: metadata.targetDate,
        weeklyHours: metadata.weeklyHours || 20,
        subjects: subjects || [],
        editalItems: items || [],
        examNotice: editalMarkdown
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
      const data = await pdf(buffer);
      const rawText = data.text;

      // Convert PDF to MD and Suggest Subject
      const existingSubjects = await db.query.subjects.findMany({
        where: eq(subjects.benchId, benchId)
      });
      const subjectsContext = existingSubjects.map(s => s.title).join(", ");

      const mdSystemPrompt = `Você é um Analista Acadêmico especializado em conversão de materiais de estudo e classificação.
      Sua missão é:
      1. Converter o texto bruto do material (PDF) em Markdown estruturado de alta qualidade.
      2. Sugerir a qual destas disciplinas o material pertence: [${subjectsContext}]. 
         Se não encontrar uma correspondência clara, sugira "Outros".
      
      Retorne APENAS um JSON no formato:
      {
        "content": "Markdown aqui...",
        "suggestedSubject": "Título da Disciplina"
      }`;

      const mdResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: `CONTEÚDO PARA PROCESSAR:\n${rawText.substring(0, 30000)}` }] }],
        config: {
          systemInstruction: {
            parts: [{ text: mdSystemPrompt }]
          }
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
      const chunks = chunkMarkdown(content);
      for (const chunk of chunks) {
        try {
          const embedding = await getEmbedding(chunk);
          await db.insert(materialChunks).values({
            materialId: material.id,
            content: chunk,
            embedding: embedding,
          });
        } catch (err) {
          console.error(`Erro ao vetorizar chunk do material ${material.id}:`, err);
        }
      }
    }

    revalidatePath(`/dashboard/bancadas/${benchId}`);
    revalidatePath("/dashboard");
    return actionSuccess({ materialId: material.id }, "Material adicionado com sucesso");
  } catch (error: any) {
    console.error("Erro ao adicionar material:", error);
    return actionError(error.message || "Erro ao adicionar material");
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

import { ActionResponse, actionError, actionSuccess, IdSchema } from "./types";

export async function deleteSubject(subjectId: string): Promise<ActionResponse<null>> {
  const validation = IdSchema.safeParse(subjectId);
  if (!validation.success) return actionError("ID inválido");

  try {
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));
    if (!subject) return actionError("Disciplina não encontrada");

    await db.transaction(async (tx) => {
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

import { createNotification } from "./notifications";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function performWebResearch(
  benchId: string,
  selectedSubjectIds?: string[],
  targetCount: number = 3
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

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
    
    // ... rest of logic ...
    
    // ... rest of logic until results.push ...

    // Get topics from edital strictly filtered by selected subjects
    let topics: string[] = [];

    if (selectedSubjectIds && selectedSubjectIds.length > 0) {
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
        error: "Nenhum assunto selecionado no contexto. Ative os switches das matérias que deseja pesquisar.",
      };
    }

    // Limit to a reasonable number of topics per request to avoid overloading
    const limitedTopics = topics.slice(0, 5);
    const results: any[] = [];

    // Generate queries for each topic
    const queryInput: QueryGenInput = {
      materia: bench.goalName,
      topicos: topics,
      editalContent: bench.examNotice || undefined,
    };

    const queryResults = await generateSearchQueries(queryInput);

    // Scrape for each query set
    for (const querySet of queryResults) {
      for (const query of querySet.queries) {
        try {
          const scrapedResults = await scrapeSearchResults(
            query,
            querySet.topic,
            targetCount
          );

          for (const scraped of scrapedResults) {
            let markdown = "";
            let wordCount = 0;

            if (scraped.markdownContent) {
              markdown = scraped.markdownContent;
              wordCount = markdown.split(/\s+/).length;
            } else {
              // Fallback to HTML conversion if markdown is not provided
              const conversionResult = await htmlToMarkdown(
                scraped.htmlContent,
                scraped.title
              );
              if (!conversionResult.isValid) continue;
              markdown = conversionResult.markdown;
              wordCount = conversionResult.wordCount;
            }

            // Calculate authority score
            const authorityScore = calculateAuthorityScore(
              scraped.domain,
              markdown
            );

            // Filter out low quality or irrelevant results (like editais/news)
            if (authorityScore < 40) {
              console.log(`Skipping low authority result (${authorityScore}): ${scraped.sourceUrl}`);
              continue;
            }

            // Save to web_sources
            const webSource = await db
              .insert(webSources)
              .values({
                benchId: bench.id as any,
                title: scraped.title,
                sourceUrl: scraped.sourceUrl,
                htmlContent: scraped.htmlContent,
                markdownContent: markdown,
                category: bench.goalName,
                topic: querySet.topic,
                authorityScore,
                status: "converted",
              })
              .returning();

            results.push({
              id: webSource[0]?.id,
              title: scraped.title,
              sourceUrl: scraped.sourceUrl,
              topic: querySet.topic,
              authorityScore,
              markdownLength: wordCount,
            });

            if (results.length >= targetCount * queryResults.length) {
              break;
            }
          }
        } catch (error) {
          console.error(`Erro ao processar query "${query}":`, error);
          continue;
        }
      }
    }

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

        // 1. Try to find the exact edital item
        // source.topic is usually "Category: Topic Name"
        const topicParts = source.topic.split(": ");
        const categoryPart = topicParts[0].toLowerCase();
        const topicPart = topicParts[1]?.toLowerCase() || source.topic.toLowerCase();

        const matchedItem = benchEditalItems.find(item => {
          const itemCat = item.category.toLowerCase().trim();
          const itemTop = item.topic.toLowerCase().trim();
          
          // Strict match: Category and Topic must align with what was searched
          return (itemCat === categoryPart && itemTop === topicPart) ||
                 (itemTop === topicPart);
        });

        if (matchedItem) {
          editalItemId = matchedItem.id;
          
          // 2. Map subject from matched edital item category
          // Exact match is safer than .includes() to avoid 'Matematica' matching 'Matematica Financeira'
          const matchedSubject = benchSubjects.find(s => 
            s.title.toLowerCase().trim() === matchedItem.category.toLowerCase().trim()
          );
          
          if (matchedSubject) {
            subjectId = matchedSubject.id;
          } else {
            // Partial match fallback only if very similar
            const partialMatch = benchSubjects.find(s => 
                matchedItem.category.toLowerCase().includes(s.title.toLowerCase()) &&
                (matchedItem.category.length - s.title.length < 5) // Strict threshold
            );
            if (partialMatch) subjectId = partialMatch.id;
          }
        }

        // 3. Fallback: Try to match subject directly from source topic or category if not found
        if (!subjectId) {
          const matchedSubject = benchSubjects.find(s => 
            s.title.toLowerCase().trim() === categoryPart ||
            (categoryPart.includes(s.title.toLowerCase()) && (categoryPart.length - s.title.length < 5))
          );
          
          if (matchedSubject) {
            subjectId = matchedSubject.id;
          }
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
          const chunks = chunkMarkdown(source.markdownContent);
          for (const chunk of chunks) {
            try {
              const embedding = await getEmbedding(chunk);
              await db.insert(materialChunks).values({
                materialId: material.id,
                content: chunk,
                embedding: embedding,
              });
            } catch (err) {
              console.error(`Erro ao vetorizar chunk do material importado ${material.id}:`, err);
            }
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
    return {
      success: false,
      error: error.message || "Erro ao importar materiais",
    };
  }
}
