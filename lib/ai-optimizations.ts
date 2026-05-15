import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

/**
 * Gera embeddings para um texto usando o modelo de embedding do Gemini.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: [text],
    });
    
    // O SDK novo retorna um array em response.embeddings
    const values = response.embeddings?.[0]?.values;
    if (!values) throw new Error("Falha ao obter embeddings do Gemini");
    
    return values;
  } catch (error) {
    console.error("Erro ao gerar embedding:", error);
    throw error;
  }
}

/**
 * Implementação das funções core de Preservação de Tokens
 * Seguindo o plano em .gemini/bestpratices/token_preservation_plan.md
 */

/**
 * Divide o conteúdo Markdown em chunks que respeitam a estrutura de parágrafos e cabeçalhos.
 * Objetivo: Preservar o contexto semântico ao fatiar para o pgvector.
 */
export function chunkMarkdown(content: string, maxChunkSize = 1000): string[] {
  const chunks: string[] = [];
  // Divide por cabeçalhos ou quebras de linha duplas
  const paragraphs = content.split(/\n(?=(?:#|---|\n))/);
  
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // Se um único parágrafo for maior que o limite, precisamos quebrá-lo também
    if (paragraph.length > maxChunkSize) {
      if (currentChunk !== "") {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      
      let remaining = paragraph;
      while (remaining.length > maxChunkSize) {
        chunks.push(remaining.substring(0, maxChunkSize).trim());
        remaining = remaining.substring(maxChunkSize);
      }
      currentChunk = remaining + "\n";
      continue;
    }

    if ((currentChunk + paragraph).length > maxChunkSize && currentChunk !== "") {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
    currentChunk += paragraph + "\n";
  }

  if (currentChunk.trim() !== "") {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Calcula a similaridade de cosseno simulada para testes unitários.
 * No ambiente real, isso é feito via pgvector no banco.
 */
export function calculateSimulatedSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
