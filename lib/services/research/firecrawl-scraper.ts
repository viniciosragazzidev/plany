import Firecrawl from '@mendable/firecrawl-js';

const apiKey = process.env.FIRECRAWL_API_KEY;
const firecrawl = new Firecrawl({ apiKey: apiKey || "" });

import { tokenizer, type ProcessedChunk } from '../infrastructure/text-processor';

/**
 * SERVIÇO: Orquestrador de Raspagem Inteligente (Web Research)
 * Executa o Firecrawl na URL e retorna os dados fragmentados e prontos para RAG.
 */
export async function scrapeAndProcessSource(url: string): Promise<{
  markdownCompleto: string;
  chunks: ProcessedChunk[];
}> {
  if (!url) throw new Error("URL inválida para processamento.");

  try {
    // 1. Executa a raspagem com o Firecrawl convertendo direto para Markdown
    const markdownLimpo = await scrapeUrlToMarkdown(url);

    // 2. Fragmentação lógica pelo micro-serviço (RecursiveCharacterTextSplitter)
    const blocosConfigurados = await tokenizer(markdownLimpo);

    return {
      markdownCompleto: markdownLimpo,
      chunks: blocosConfigurados
    };
  } catch (error: any) {
    console.error("[Infrastructure-Scraper-Pipeline] Erro na esteira:", error.message);
    throw new Error(`Falha na esteira de infraestrutura do Scraper: ${error.message}`);
  }
}

/**
 * SERVIÇO: Web Search Isolado
 * Busca na web usando queries (Dorks) e retorna resultados estruturados.
 */
export async function searchWeb(query: string, limit: number = 5): Promise<Array<{ title: string; url: string }>> {
  if (!query) return [];

  try {
    const results = await firecrawl.search(query, { limit });
    
    // Na v4+, os resultados estão na propriedade 'web' (conforme documentação oficial)
    const data = (results as any).web || (results as any).data || [];

    return data.map((r: any) => ({
      title: r.title || "Sem título",
      url: r.url || ""
    }));
  } catch (error: any) {
    console.error("[Infrastructure-Search] Erro ao buscar na web:", error.message);
    return [];
  }
}

/**
 * SERVIÇO: Web Scraper Isolado
 * Transforma qualquer página web em Markdown limpo para LLMs.
 */
export async function scrapeUrlToMarkdown(url: string): Promise<string> {
  if (!url) throw new Error("URL inválida para raspagem.");
  
  try {
    // Na v4+, o método scrape retorna o documento diretamente
    const scrapeResult = await firecrawl.scrape(url, { formats: ['markdown'] });
    
    // O resultado é o próprio objeto Document que contém a propriedade markdown
    return (scrapeResult as any).markdown || '';
  } catch (error: any) {
    console.error("[Infrastructure-Scraper] Erro ao raspar URL:", error.message);
    throw error;
  }
}
