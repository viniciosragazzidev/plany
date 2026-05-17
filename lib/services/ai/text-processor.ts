import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/**
 * Interface que define a estrutura de saída de cada pedaço de texto processado.
 */
interface ProcessedChunk {
  content: string;     // O texto limpo e segmentado
  estimatedTokens: number; // Estimativa de custo de tokens para a API
}

/**
 * MICRO-SERVIÇO: Processador de Texto e Tokenizador Contextual
 * 
 * Objetivo: Fatiar textos longos (Editais brutos, PDFs extraídos) em blocos logicamente 
 * coesos, garantindo que frases e conceitos jurídicos não sejam cortados pela metade.
 * 
 * @param texto_bruto - String extraída do PDF ou input do usuário.
 * @returns Array de blocos estruturados Prontos para envio à API do Gemini.
 */
export async function tokenizer(texto_bruto: string): Promise<ProcessedChunk[]> {
  if (!texto_bruto || texto_bruto.trim() === "") {
    return [];
  }

  // Configuração cirúrgica para o Gemini 2.5 Flash
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 8000,      // ~6.000 palavras por bloco (ideal para o Gemini entender o contexto sem perder precisão)
    chunkOverlap: 800,    // 10% de sobreposição para manter a conexão de sentido entre o fim de um bloco e o início do outro
    separators: ["\n\n", "\n", " ", ""], // Hierarquia de quebra lógica
  });

  // Executa o fatiamento inteligente
  const docs = await splitter.createDocuments([texto_bruto]);

  // Mapeia os documentos gerados para o formato que a nossa Service Layer de IA espera
  return docs.map((doc) => {
    // Cálculo estatístico padrão da indústria: ~4 caracteres equivalem a 1 token em inglês/estruturas mistas.
    // Para português, usamos uma margem segura de 3.5 caracteres por token.
    const estimatedTokens = Math.ceil(doc.pageContent.length / 3.5);

    return {
      content: doc.pageContent,
      estimatedTokens: estimatedTokens,
    };
  });
}
