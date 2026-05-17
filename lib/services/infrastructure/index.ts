import { scrapeUrlToMarkdown } from './web-scraper';
import { tokenizer, type ProcessedChunk } from './text-processor';

/**
 * Resultado unificado da orquestração de captura web.
 */
export interface WebCaptureResult {
  markdownCompleto: string;
  blocos: ProcessedChunk[];
  totalEstimatedTokens: number;
}

/**
 * SERVIÇO GLOBAL: Captura e Preparação de Conteúdo Web
 * Orquestra o fluxo completo: Consome uma URL, raspa o conteúdo em Markdown limpo
 * e entrega os blocos tokenizados prontos para alimentação de RAG ou Chat.
 * 
 * Este é o ponto de entrada principal (Cubo de Engrenagens) para novas funcionalidades 
 * que dependem de ingestão de dados externos.
 */
export async function captureAndTokenizeWebPage(url: string): Promise<WebCaptureResult> {
  // 1. Executa o Scraper isolado (Engrenagem A)
  const markdownBruto = await scrapeUrlToMarkdown(url);
  
  // 2. Executa o Tokenizer isolado (Engrenagem B)
  const blocosProntosParaIA = await tokenizer(markdownBruto);
  
  // 3. Retorna a estrutura mastigada para o consumidor (Action, Route, etc)
  return {
    markdownCompleto: markdownBruto,
    blocos: blocosProntosParaIA,
    totalEstimatedTokens: blocosProntosParaIA.reduce((acc, c) => acc + c.estimatedTokens, 0)
  };
}

// Re-exporta tipos e funções individuais para flexibilidade
export * from './web-scraper';
export * from './text-processor';
