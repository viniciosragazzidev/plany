import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { studyBenches, subjects, materials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 30;

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { messages, benchId } = await req.json();

    // Contexto básico da bancada
    const bench = await db.query.studyBenches.findFirst({
      where: eq(studyBenches.id, benchId),
    });

    const lastMessage = messages[messages.length - 1].content;

    // Chamada simples conforme solicitado
    const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
      contents: lastMessage,
      systemInstruction: `Você é o Plany, tutor acadêmico para a meta: ${bench?.goalName || "Estudo"}.`,
    });

    return NextResponse.json({ content: response.text });
  } catch (error: any) {
    console.error("Erro na Rota de Chat Simplificada:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
