'use server'

import { db } from "@/lib/db";
import { 
  flashcards, 
  flashcardAttempts, 
  materials, 
  materialChunks, 
  subjects 
} from "@/lib/db/schema";
import { eq, and, desc, sql, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateAIContent } from "@/lib/services/ai/ai-service";
import { getEmbedding } from "@/lib/services/ai/ai-optimizations";

/**
 * Gera Flashcards usando RAG (Busca Cirúrgica)
 */
export async function generateFlashcardsAction(
  benchId: string, 
  subjectId: string, 
  topicText?: string
) {
  try {
    const subject = await db.query.subjects.findFirst({
      where: eq(subjects.id, subjectId)
    });

    const searchQuery = topicText || subject?.title || "Geral";
    const queryEmbedding = await getEmbedding(searchQuery);

    let contextText = "";

    if (queryEmbedding) {
      // 1. RAG: Buscar os 10 chunks mais relevantes para o assunto
      const relevantChunks = await db
        .select({
          content: materialChunks.content,
        })
        .from(materialChunks)
        .innerJoin(materials, eq(materialChunks.materialId, materials.id))
        .where(eq(materials.benchId, benchId))
        .orderBy(t => desc(sql`1 - (${materialChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`))
        .limit(10);

      contextText = relevantChunks.map(c => c.content).join("\n\n");
    }

    // FALLBACK: Se não houver chunks vetorizados, tenta buscar o conteúdo bruto dos materiais
    if (!contextText) {
      console.log("Nenhum chunk encontrado, tentando fallback para conteúdo bruto...");
      const rawMaterials = await db
        .select({ content: materials.content })
        .from(materials)
        .where(
          and(
            eq(materials.benchId, benchId),
            subjectId ? eq(materials.subjectId, subjectId) : undefined
          )
        )
        .limit(3);
      
      contextText = rawMaterials.map(m => m.content).filter(Boolean).join("\n\n");
    }

    if (!contextText) {
      throw new Error("Nenhum material encontrado para basear os flashcards. Certifique-se de que os materiais possuem conteúdo de texto.");
    }

    // 2. Prompt para o Gemini 1.5 Flash
    const systemPrompt = `Você é um especialista em Aprendizado Ativo e Repetição Espaçada.
    Sua missão é criar 10 Flashcards de alta qualidade baseados no conteúdo fornecido.
    
    REGRAS:
    - O 'front' deve ser uma pergunta curta, um termo para definir ou um conceito lacunado (cloze).
    - O 'back' deve ser a resposta direta, explicação concisa ou o termo faltante.
    - Foque em pontos chave, das, fórmulas ou conceitos que costumam cair em provas.
    - Retorne APENAS um JSON válido.

    FORMATO JSON:
    {
      "flashcards": [
        { "front": "O que é X?", "back": "X é Y..." },
        ...
      ]
    }`;

    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `CONTEÚDO DE BASE:\n${contextText}` }] }],
      config: {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("IA retornou resposta vazia.");
    
    const data = JSON.parse(responseText);

    // 3. Salvar no Banco
    const result = await db.transaction(async (tx) => {
      const savedFlashcards = [];
      for (const card of data.flashcards) {
        const [newCard] = await tx.insert(flashcards).values({
          benchId,
          subjectId,
          front: card.front,
          back: card.back,
        }).returning();
        savedFlashcards.push(newCard);
      }
      return savedFlashcards;
    });

    revalidatePath(`/dashboard/bancadas/${benchId}`);
    return { success: true, count: result.length };
  } catch (error: any) {
    console.error("Erro ao gerar flashcards:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualiza o progresso do Flashcard usando o algoritmo SM-2
 */
export async function submitFlashcardReviewAction(
  flashcardId: string, 
  performance: number // 0-5
) {
  try {
    const [card] = await db.select().from(flashcards).where(eq(flashcards.id, flashcardId));
    if (!card) throw new Error("Flashcard não encontrado");

    let easeFactor = parseFloat(card.easeFactor);
    let interval = card.interval;
    let repetitions = card.repetitions;

    // SM-2 Logic
    if (performance >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions++;
    } else {
      repetitions = 0;
      interval = 1;
    }

    easeFactor = easeFactor + (0.1 - (5 - performance) * (0.08 + (5 - performance) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);

    await db.transaction(async (tx) => {
      await tx.update(flashcards)
        .set({
          easeFactor: easeFactor.toString(),
          interval,
          repetitions,
          nextReviewAt,
          lastReviewedAt: new Date(),
        })
        .where(eq(flashcards.id, flashcardId));

      await tx.insert(flashcardAttempts).values({
        flashcardId,
        performance,
      });
    });

    return { success: true, nextReview: nextReviewAt };
  } catch (error: any) {
    console.error("Erro ao revisar flashcard:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca flashcards para revisão (nextReviewAt <= agora)
 */
export async function getFlashcardsForReviewAction(benchId: string, subjectId?: string) {
  try {
    const now = new Date();
    const query = db
      .select()
      .from(flashcards)
      .where(
        and(
          eq(flashcards.benchId, benchId),
          subjectId ? eq(flashcards.subjectId, subjectId) : undefined,
          lte(flashcards.nextReviewAt, now)
        )
      )
      .orderBy(flashcards.nextReviewAt);

    const cards = await query;
    return { success: true, flashcards: cards };
  } catch (error: any) {
    console.error("Erro ao buscar flashcards:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca todos os flashcards de uma matéria/bancada
 */
export async function getFlashcardStatsAction(benchId: string) {
  try {
    const allCards = await db.select().from(flashcards).where(eq(flashcards.benchId, benchId));
    const now = new Date();
    
    const reviewCount = allCards.filter(c => c.nextReviewAt <= now).length;
    
    return { 
      success: true, 
      total: allCards.length,
      dueForReview: reviewCount 
    };
  } catch (error: any) {
    console.error("Erro ao buscar estatísticas de flashcards:", error);
    return { success: false, error: error.message };
  }
}
