import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

/**
 * Gera embeddings para um texto usando o modelo de embedding do Gemini.
 * Inclui lógica de retry e fallback silencioso se todos os modelos falharem.
 */
export async function getEmbedding(text: string, maxRetries = 1): Promise<number[] | null> {
  const models = [
    "models/gemini-embedding-001",
    "models/text-embedding-004", 
    "text-embedding-004",
    "embedding-001"
  ];
  
  for (const modelName of models) {
    const model = genAI.getGenerativeModel({ model: modelName });
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const result = await model.embedContent({
          content: { role: 'user', parts: [{ text: text.substring(0, 30000) }] },
          // @ts-ignore
          outputDimensionality: 768
        });
        const values = result.embedding.values;
        
        if (values) return values;
      } catch (error: any) {
        // Erro de Quota (429): Espera curta e tenta de novo se houver retentativas
        if (error.status === 429 && i < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        // Se o modelo não existir ou houver outro erro, tenta o próximo modelo da lista
        break;
      }
    }
  }
  
  console.warn("[Embedding] Não foi possível gerar vetores. Buscas semânticas desativadas temporariamente.");
  return null;
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
