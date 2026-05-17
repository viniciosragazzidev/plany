import axios from "axios";
import * as cheerio from "cheerio";

export interface ScrapedResult {
  title: string;
  sourceUrl: string;
  htmlContent: string;
  markdownContent?: string;
  topic: string;
  domain: string;
}

// List of trusted educational domains
const TRUSTED_DOMAINS = [
  ".edu.br",
  ".gov.br",
  ".ac.br", // Academic institutions
  "academia.edu",
  "researchgate.net",
  "wikipedia.org",
  "britannica.com",
];

const BLOCKED_KEYWORDS = [
  "anúncio",
  "publicidade",
  "ad",
  "spam",
  "clickbait",
  "edital",
  "concurso",
  "inscrição",
  "vaga",
  "cronograma",
  "resultado",
  "gabarito",
  "convocação",
  "pci concursos",
  "folha dirigida",
  "gran cursos",
  "estratégia concursos",
];

const SERPER_API_KEY = process.env.SERPER_API_KEY;

export function calculateAuthorityScore(domain: string, content: string): number {
  let score = 50; // Base score
  const lowerContent = content.toLowerCase();

  // Domain authority
  if (domain.includes(".edu.br")) score += 30;
  else if (domain.includes(".gov.br")) score += 25;
  else if (domain.includes("academia.edu")) score += 15;
  else if (domain.includes("researchgate.net")) score += 15;
  else if (domain.includes(".edu")) score += 10;
  else if (domain.includes(".org")) score += 5;

  // Content quality indicators
  if (content.includes("##") || content.includes("###")) score += 10; // Markdown headers
  if (content.includes("|") && content.split("|").length > 5) score += 10; // Tables
  
  // Penalize competition notices and news
  const editalKeywords = ["edital", "concurso", "vagas", "inscrição", "prova", "cronograma", "gabarito", "convocação"];
  let editalCount = 0;
  editalKeywords.forEach(kw => {
    if (lowerContent.includes(kw)) editalCount++;
  });

  if (editalCount >= 3) score -= 30;
  
  // Detect if it's just a list (low text-to-bullet ratio)
  // This often identifies editais that just list subjects
  const listItems = (content.match(/^[\*\-]\s/gm) || []).length;
  const sentences = (content.match(/\. /g) || []).length;
  if (listItems > 10 && sentences < 5) score -= 40; 

  // Content length validation
  const wordCount = content.split(/\s+/).length;
  if (wordCount < 150) score -= 40; // Too short for a real explanation
  if (wordCount > 10000) score -= 10; // Too long, might be noise

  return Math.min(100, Math.max(1, score));
}

function getDomainfromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return "";
  }
}

async function fetchJinaMarkdown(url: string): Promise<string | null> {
  try {
    // Jina Reader is a great way to get clean markdown from a URL
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await axios.get(jinaUrl, {
      timeout: 30000, // Increase to 30s for large PDFs
      headers: {
        "X-No-Cache": "true",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    return response.data;
  } catch (error: any) {
    // Only log essential info to avoid terminal clutter
    console.error(`Falha no Jina Reader (${url.substring(0, 50)}...): ${error.code || error.message}`);
    return null;
  }
}

export async function scrapeUrl(
  url: string,
  topic: string
): Promise<ScrapedResult | null> {
  const markdown = await fetchJinaMarkdown(url);
  if (!markdown) return null;

  try {
    // Extract title from markdown (usually the first # line)
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : url.split("/").pop() || "Untitled";

    const domain = getDomainfromUrl(url);

    return {
      title,
      sourceUrl: url,
      htmlContent: "", 
      markdownContent: markdown,
      topic,
      domain,
    };
  } catch (error) {
    console.error(`Erro ao processar conteúdo de ${url}:`, error);
    return null;
  }
}

export async function scrapeSearchResults(
  query: string,
  topic: string,
  maxResults = 5
): Promise<ScrapedResult[]> {
  console.log(`Searching for: ${query} (${topic})`);

  if (!SERPER_API_KEY) {
    console.warn("SERPER_API_KEY não configurada. A busca web não funcionará corretamente.");
    return [];
  }

  try {
    const response = await axios.post(
      "https://google.serper.dev/search",
      { q: query, num: maxResults },
      {
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const searchResults = response.data.organic || [];
    const results: ScrapedResult[] = [];

    // Filter results first
    const filteredItems = searchResults.filter((item: any) => {
      const lowerLink = item.link.toLowerCase();
      const lowerTitle = (item.title || "").toLowerCase();
      return !BLOCKED_KEYWORDS.some(kw => 
        lowerLink.includes(kw.toLowerCase()) || lowerTitle.includes(kw.toLowerCase())
      );
    }).slice(0, maxResults * 2); // Get a bit more than needed to account for failures

    // Scrape in parallel batches
    const batchSize = 3;
    for (let i = 0; i < filteredItems.length; i += batchSize) {
      const batch = filteredItems.slice(i, i + batchSize);
      const scrapePromises = batch.map((item: any) => scrapeUrl(item.link, topic));
      const scrapedBatch = await Promise.all(scrapePromises);
      
      for (const res of scrapedBatch) {
        if (res) {
          results.push({
            ...res,
            htmlContent: res.htmlContent || "",
          });
        }
        if (results.length >= maxResults) break;
      }
      if (results.length >= maxResults) break;
    }

    return results;
  } catch (error) {
    console.error("Erro na busca via Serper:", error);
    return [];
  }
}


function generateSearchUrls(query: string): string[] {
  // Generate Google search URLs (in production, use API)
  const encoded = encodeURIComponent(query);
  return [
    `https://www.google.com/search?q=${encoded}+site:edu.br`,
    `https://www.google.com/search?q=${encoded}+site:gov.br`,
    `https://scholar.google.com.br/scholar?q=${encoded}`,
  ];
}
