import { generateAIContent, generateEmbedding } from "./ai-service";

/**
 * Gera embeddings para um texto.
 * Agora centralizado via ai-service para suportar modelos locais (Ollama) e fallbacks.
 */
export async function getEmbedding(text: string, maxRetries = 1): Promise<number[] | null> {
  return generateEmbedding(text);
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
 * Classifica a natureza de um trecho de anotação usando Gemini 2.5 Flash.
 * Objetivo: Enriquecer metadados para RAG cirúrgico.
 */
export async function classifyChunk(text: string): Promise<string> {
  try {
    const prompt = `Analise o trecho de anotação de aula fornecido e retorne estritamente uma única palavra da lista: [Dica, Exemplo, Lei, Macete]. Não explique sua escolha.\n\nTRECHO: "${text.substring(0, 2000)}"`;
    
    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const category = response.text.trim().replace(/[^\w]/g, "");
    
    const validCategories = ["Dica", "Exemplo", "Lei", "Macete"];
    return validCategories.includes(category) ? category : "Outro";
  } catch (error) {
    console.error("[AI-Classify] Erro ao classificar chunk:", error);
    return "Outro";
  }
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
