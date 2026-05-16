import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { studyBenches, subjects, materials, profiles, editalItems, materialChunks, semanticCache } from "@/lib/db/schema";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { getEmbedding } from "@/lib/ai-optimizations";

export const maxDuration = 30;

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { 
      messages, 
      benchId, 
      selectedSubjectIds, 
      isEditalConsultantMode 
    } = await req.json();

    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";

    // 1. Semantic Cache Check (Graceful)
    let queryEmbedding: number[] | null = null;
    if (!isEditalConsultantMode && lastUserMessage) {
      try {
        queryEmbedding = await getEmbedding(lastUserMessage);
        
        if (queryEmbedding) {
          const [cachedResponse] = await db
            .select({
              response: semanticCache.response,
              similarity: sql<number>`1 - (${semanticCache.queryEmbedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`
            })
            .from(semanticCache)
            .where(eq(semanticCache.benchId, benchId))
            .orderBy(t => desc(t.similarity))
            .limit(1);

          if (cachedResponse && cachedResponse.similarity > 0.95) {
            return NextResponse.json({ content: cachedResponse.response, isCached: true });
          }
        }
      } catch (embError) {
        console.warn("[Chat] Erro ao buscar cache semântico:", embError);
      }
    }

    // 2. Buscar Informações da Bancada
    const bench = await db.query.studyBenches.findFirst({
      where: eq(studyBenches.id, benchId),
    });

    if (!bench) {
      return NextResponse.json({ error: "Bancada não encontrada" }, { status: 404 });
    }

    let systemPrompt = "";

    if (isEditalConsultantMode) {
      const editalContent = bench.examNotice || bench.examNoticeRaw || "Conteúdo do edital não disponível.";
      systemPrompt = `Você é o CONSULTOR DE EDITAL da plataforma PLANY.
Responda APENAS com base no edital: ${bench.goalName}.
Fonte: ${editalContent}`;
    } else {
      let contextMaterials = "";
      try {
        if (!queryEmbedding) queryEmbedding = await getEmbedding(lastUserMessage);

        if (queryEmbedding) {
          const relevantChunks = await db
            .select({
              content: materialChunks.content,
              materialTitle: materials.title,
              similarity: sql<number>`1 - (${materialChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`
            })
            .from(materialChunks)
            .innerJoin(materials, eq(materialChunks.materialId, materials.id))
            .where(
              and(
                eq(materials.benchId, benchId),
                selectedSubjectIds && selectedSubjectIds.length > 0 
                  ? inArray(materials.subjectId, selectedSubjectIds)
                  : undefined
              )
            )
            .orderBy(t => desc(t.similarity))
            .limit(5);

          contextMaterials = relevantChunks
            .map(c => `--- MATERIAL: ${c.materialTitle} ---\n${c.content}`)
            .join("\n\n");
        }
      } catch (ragError) {
        console.warn("[Chat] RAG indisponível, usando conhecimento geral.");
      }

      systemPrompt = `Você é o PLANY, tutor de IA. Use prioritariamente os materiais:
${contextMaterials || "Sem materiais específicos. Use seu conhecimento acadêmico."}
Objetivo: ${bench.goalName}`;
    }

    // 3. Geração com Fallback Multi-Modelo
    // IMPORTANTE: O Gemini exige que a primeira mensagem do histórico seja obrigatoriamente do 'user'.
    const rawHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Encontra o índice da primeira mensagem de usuário
    const firstUserIndex = rawHistory.findIndex(m => m.role === "user");
    const history = firstUserIndex !== -1 ? rawHistory.slice(firstUserIndex) : [];

    const models = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5"];
    let resultText = "";
    let lastError: any;

    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          systemInstruction: systemPrompt 
        });
        
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastUserMessage);
        resultText = result.response.text();
        
        if (resultText) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Chat] Modelo ${modelName} falhou:`, err.message);
        if (err.status === 429 || err.status === 404) continue;
        break; 
      }
    }

    if (!resultText) {
      throw lastError || new Error("IA temporariamente indisponível.");
    }

    // 4. Cache Semântico (Async)
    if (!isEditalConsultantMode && lastUserMessage && resultText && queryEmbedding) {
      db.insert(semanticCache).values({
        benchId,
        query: lastUserMessage,
        queryEmbedding,
        response: resultText,
      }).catch(e => console.error("[Chat] Erro ao salvar cache:", e));
    }

    return NextResponse.json({ content: resultText });
  } catch (error: any) {
    console.error("[Chat] Erro Fatal:", error);
    return NextResponse.json({ error: "Desculpe, a IA está sobrecarregada. Tente novamente em instantes." }, { status: 500 });
  }
}
