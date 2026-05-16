import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
// Instancia o cliente oficial do novo SDK do Gemini
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

/**
 * Gera embeddings para um texto usando o modelo de embedding do Gemini.
 * Inclui uma lógica simples de retry para lidar com limites de quota (429).
 */
export async function getEmbedding(text: string, maxRetries = 2): Promise<number[]> {
  let lastError: any;
  
  const models = ["text-embedding-004", "embedding-001"];
  
  for (const modelName of models) {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await ai.models.embedContent({
          model: modelName,
          contents: text, 
        });
        
        const values = response.embeddings?.[0]?.values;
        if (!values) throw new Error("Falha ao obter embeddings do Gemini");
        
        return values;
      } catch (error: any) {
        lastError = error;
        // Se for erro de quota (429), espera um pouco antes de tentar de novo
        if (error.status === 429 && i < maxRetries) {
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        // Se for 404, tenta o próximo modelo
        if (error.status === 404) {
          break;
        }
        break; 
      }
    }
  }
  
  console.error("Erro ao gerar embedding após retentativas:", lastError);
  throw lastError;
}


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
    // CORREÇÃO/MELHORIA: Garante que parágrafos gigantes isolados sejam fatiados com segurança
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
  if (normA === 0 || normB === 0) return 0; // Proteção contra divisão por zero
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
