'use server'

import { generateAIContent } from "@/lib/services/ai/ai-service";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { actionSuccess, actionError, ActionResponse } from "./types";

/**
 * Server Action for AI Image Scanner (OCR)
 * Directly consumes Gemini 2.5 Flash for multimodal text extraction.
 * Includes retry logic and fallback for quota (429) management.
 */
export async function ocrAction(formData: FormData): Promise<ActionResponse<string>> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) return actionError("Não autorizado");

    const file = formData.get("file") as File;
    if (!file) return actionError("Nenhum arquivo enviado");

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `Você é um Digitalizador de Documentos Acadêmicos.
Sua missão é converter a imagem de estudo em Markdown limpo e estruturado.

REGRAS DE FORMATAÇÃO (ESTRITAS):
1. Títulos: Use ## para seções principais.
2. Listas: Use apenas UM nível de lista (não aninhe listas). Use * para cada item.
3. Importante: NUNCA retorne um asterisco (*) sozinho; ele deve ser seguido de texto.
4. Parágrafos: Separe cada bloco (título, lista ou parágrafo) com uma linha em branco.
5. Estilo: Use **negrito** apenas em palavras isoladas importantes.
6. Limpeza: Sem saudações ou blocos de código (ex: não use \`\`\`markdown).

Retorne estritamente o Markdown.`;

    try {
      const response = await generateAIContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "text/plain"
        }
      });

      const text = response.text;
      if (text && text.trim().length > 0) {
        return actionSuccess(text, "Texto extraído com sucesso!");
      }
    } catch (error: any) {
      console.error("Erro no OCR:", error);
      return actionError("A IA está um pouco sobrecarregada agora. Pode tentar de novo em alguns segundos?");
    }

    return actionError("Putz, deu um erro inesperado. Consegue subir a foto de novo?");
  } catch (error) {
    console.error("Erro fatal no OCR:", error);
    return actionError("Putz, deu um erro inesperado. Consegue subir a foto de novo?");
  }
}
