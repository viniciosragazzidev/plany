'use server'

import { GoogleGenAI } from "@google/genai";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { actionSuccess, actionError, ActionResponse } from "./types";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

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

    const models = ["gemini-2.5-flash", "gemini-1.5-flash"];
    let lastError: any;

    for (const modelName of models) {
      // Tenta 2 vezes por modelo com espera entre elas se for 429
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
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
          lastError = error;
          
          // Se for erro de quota (429), espera e tenta de novo ou muda de modelo
          if (error.status === 429) {
            if (attempt === 0) {
              const delay = 2000; // Espera 2s antes da retentativa no mesmo modelo
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            // No segundo erro 429, sai do loop interno para tentar o próximo modelo
            break;
          }
          // Outros erros (404, etc), tenta o próximo modelo imediatamente
          break;
        }
      }
    }

    console.error("Erro final no OCR após retentativas:", lastError);
    return actionError("A IA está um pouco sobrecarregada agora. Pode tentar de novo em alguns segundos?");
  } catch (error) {
    console.error("Erro fatal no OCR:", error);
    return actionError("Putz, deu um erro inesperado. Consegue subir a foto de novo?");
  }
}
