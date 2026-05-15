'use server'

import { db } from "@/lib/db";
import { 
  quizzes, 
  questions, 
  options, 
  quizAttempts, 
  materials, 
  subjects, 
  editalItems 
} from "@/lib/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { GoogleGenAI } from "@google/genai";
import { getEmbedding } from "@/lib/ai-optimizations";
import { materialChunks } from "@/lib/db/schema";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function generateQuizAction(
  benchId: string, 
  subjectId: string, 
  selectedEditalItemIds: string[]
) {
  try {
    // 1. Get Context: Using Surgical RAG
    const subject = await db.query.subjects.findFirst({
      where: eq(subjects.id, subjectId)
    });

    const editalItemsList = await db.query.editalItems.findMany({
      where: inArray(editalItems.id, selectedEditalItemIds)
    });

    const searchQueries = editalItemsList.map(item => item.topic).join(", ") || subject?.title || "Geral";
    const queryEmbedding = await getEmbedding(searchQueries);

    // Retrieval: Get Top 15 relevant chunks
    const relevantChunks = await db
      .select({
        content: materialChunks.content,
      })
      .from(materialChunks)
      .innerJoin(materials, eq(materialChunks.materialId, materials.id))
      .where(
        and(
          eq(materials.benchId, benchId),
          selectedEditalItemIds.length > 0 
            ? inArray(materials.editalItemId, selectedEditalItemIds)
            : eq(materials.subjectId, subjectId)
        )
      )
      .orderBy(t => desc(sql`1 - (${materialChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`))
      .limit(15);

    const contextText = relevantChunks
      .map(c => c.content)
      .join("\n\n");

    if (!contextText) {
      throw new Error("Não encontramos materiais suficientes indexados para gerar este simulado. Tente subir mais PDFs ou aguarde a vetorização.");
    }

    // 2. Prompt AI for Quiz Generation
    const systemPrompt = `Você é um Analista de Provas e Concursos da Kyper Agência.
    Sua missão é gerar um simulado inédito e desafiador baseado estritamente no conteúdo fornecido.
    
    REGRAS:
    - Gere exatamente 10 questões de múltipla escolha.
    - Cada questão deve ter 4 opções (A, B, C, D).
    - Apenas uma opção é correta.
    - Forneça uma explicação detalhada para a resposta correta.
    - O estilo deve simular grandes bancas de concursos (FGV, CESPE, Vunesp).
    - Retorne APENAS um JSON válido.

    FORMATO JSON:
    {
      "title": "Simulado: ${subject?.title || 'Personalizado'}",
      "questions": [
        {
          "content": "Texto da pergunta...",
          "explanation": "Explicação do porquê a resposta X está correta...",
          "options": [
            { "content": "Opção A", "isCorrect": false },
            { "content": "Opção B", "isCorrect": true },
            { "content": "Opção C", "isCorrect": false },
            { "content": "Opção D", "isCorrect": false }
          ]
        }
      ]
    }`;

    const response = await ai.models.generateContent({
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
    if (!responseText) throw new Error("Resposta da IA vazia");
    const quizData = JSON.parse(responseText);

    // 3. Database Operations: FIFO & Save
    const result = await db.transaction(async (tx) => {
      // FIFO: Check if we have 5 quizzes already in this bench
      const existingQuizzes = await tx.query.quizzes.findMany({
        where: eq(quizzes.benchId, benchId),
        orderBy: [desc(quizzes.createdAt)]
      });

      if (existingQuizzes.length >= 10) { // Increased to 10 for better UX
        // Delete oldest
        const oldest = existingQuizzes[existingQuizzes.length - 1];
        await tx.delete(quizzes).where(eq(quizzes.id, oldest.id));
      }

      // Save Quiz
      const [newQuiz] = await tx.insert(quizzes).values({
        benchId,
        subjectId,
        title: quizData.title || `Simulado: ${subject?.title}`,
        status: "ready",
      }).returning();

      // Save Questions and Options
      for (const q of quizData.questions) {
        const [newQuestion] = await tx.insert(questions).values({
          quizId: newQuiz.id,
          content: q.content,
          explanation: q.explanation,
        }).returning();

        for (const opt of q.options) {
          await tx.insert(options).values({
            questionId: newQuestion.id,
            content: opt.content,
            isCorrect: opt.isCorrect,
          });
        }
      }

      return newQuiz;
    });

    revalidatePath(`/dashboard/bancadas/${benchId}`);
    return { success: true, quizId: result.id };
  } catch (error: any) {
    console.error("Erro ao gerar quiz:", error);
    return { success: false, error: error.message };
  }
}

export async function submitQuizAnswerAction(data: {
  quizId: string;
  questionId: string;
  selectedOptionId: string;
  confidenceLevel: "certo" | "duvidoso" | "chutando";
}) {
  try {
    const option = await db.query.options.findFirst({
      where: eq(options.id, data.selectedOptionId)
    });

    if (!option) throw new Error("Opção não encontrada");

    await db.insert(quizAttempts).values({
      quizId: data.quizId,
      questionId: data.questionId,
      selectedOptionId: data.selectedOptionId,
      isCorrect: option.isCorrect,
      confidenceLevel: data.confidenceLevel,
    });

    return { success: true, isCorrect: option.isCorrect };
  } catch (error: any) {
    console.error("Erro ao salvar resposta:", error);
    return { success: false, error: error.message };
  }
}

export async function finishQuizAction(quizId: string) {
  try {
    const attempts = await db.query.quizAttempts.findMany({
      where: eq(quizAttempts.quizId, quizId)
    });

    const correctCount = attempts.filter(a => a.isCorrect).length;
    const totalCount = await db.select({ count: sql`count(*)` }).from(questions).where(eq(questions.quizId, quizId));
    
    const total = Number(totalCount[0].count);
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    await db.update(quizzes)
      .set({ score })
      .where(eq(quizzes.id, quizId));

    const quiz = await db.query.quizzes.findFirst({
      where: eq(quizzes.id, quizId)
    });

    revalidatePath(`/dashboard/bancadas/${quiz?.benchId}`);
    return { success: true, score };
  } catch (error: any) {
    console.error("Erro ao finalizar quiz:", error);
    return { success: false, error: error.message };
  }
}

export async function getQuizzesAction(benchId: string) {
  try {
    if (!benchId) throw new Error("Bench ID is required");

    console.log(`[getQuizzesAction] Fetching for bench: ${benchId}`);

    // Using select().from() for maximum reliability
    const quizList = await db.select({
      id: quizzes.id,
      benchId: quizzes.benchId,
      subjectId: quizzes.subjectId,
      title: quizzes.title,
      status: quizzes.status,
      score: quizzes.score,
      createdAt: quizzes.createdAt,
      subject: {
        id: subjects.id,
        title: subjects.title
      }
    })
    .from(quizzes)
    .leftJoin(subjects, eq(quizzes.subjectId, subjects.id))
    .where(eq(quizzes.benchId, benchId))
    .orderBy(desc(quizzes.createdAt));

    console.log(`[getQuizzesAction] Found ${quizList.length} quizzes`);

    return { 
      success: true, 
      quizzes: JSON.parse(JSON.stringify(quizList))
    };
  } catch (error: any) {
    console.error("Critical error in getQuizzesAction:", error);
    return { success: false, error: error.message, quizzes: [] };
  }
}

export async function getQuizDetailsAction(quizId: string) {
  try {
    if (!quizId) throw new Error("Quiz ID is required");

    console.log(`[getQuizDetailsAction] Fetching details for quiz: ${quizId}`);

    // 1. Fetch Quiz Basic Info
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) throw new Error("Simulado não encontrado");

    // 2. Fetch Questions
    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, quizId));
    
    // 3. Fetch Options for each question
    const questionsWithOptions = await Promise.all(quizQuestions.map(async (q) => {
      const qOptions = await db.select().from(options).where(eq(options.questionId, q.id));
      return {
        ...q,
        options: qOptions
      };
    }));

    const fullQuiz = {
      ...quiz,
      questions: questionsWithOptions
    };

    console.log(`[getQuizDetailsAction] Successfully loaded quiz with ${quizQuestions.length} questions`);

    return { 
      success: true, 
      quiz: JSON.parse(JSON.stringify(fullQuiz))
    };
  } catch (error: any) {
    console.error("Critical error in getQuizDetailsAction:", error);
    return { success: false, error: error.message };
  }
}
