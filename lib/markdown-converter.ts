import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export interface ConversionResult {
  markdown: string;
  wordCount: number;
  isValid: boolean;
}

export async function htmlToMarkdown(
  htmlContent: string,
  title?: string
): Promise<ConversionResult> {
  if (!htmlContent || htmlContent.length < 100) {
    return {
      markdown: "",
      wordCount: 0,
      isValid: false,
    };
  }

  const systemPrompt = `Você é um especialista em conversão de documentos web para Markdown.
Sua missão é converter HTML/conteúdo web para Markdown bem estruturado e limpo.

Instruções rigorosas:
1. Preserve headers usando # (h1), ## (h2), ### (h3), etc
2. Converta listas (ul/ol) para formato Markdown (- ou 1.)
3. Preserve tabelas em formato Markdown
4. Remova completamente: scripts, estilos inline, IDs, classes, atributos vazios
5. Remova rodapés, menus de navegação, anúncios
6. Remova links de rastreamento, cookies notices, popups
7. Preserve apenas o "core" do conhecimento educacional
8. Use negrito (**) para termos importantes
9. Use citações (>) para destacar definições
10. Retorne APENAS o Markdown sem código de bloco ou comentários

Objetivo final: Um documento Markdown limpo e educacional.`;

  const userPrompt = `${title ? `Título: ${title}\n\n` : ""}HTML/Conteúdo para converter:

${htmlContent.substring(0, 15000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      },
    });

    const markdown = response.text;

    if (!markdown || markdown.length < 500) {
      return {
        markdown: "",
        wordCount: 0,
        isValid: false,
      };
    }

    const wordCount = markdown.split(/\s+/).length;

    return {
      markdown,
      wordCount,
      isValid: true,
    };
  } catch (error) {
    console.error("Erro ao converter para Markdown:", error);
    return {
      markdown: "",
      wordCount: 0,
      isValid: false,
    };
  }
}

export async function pdfTextToMarkdown(
  pdfText: string,
  title?: string
): Promise<ConversionResult> {
  if (!pdfText || pdfText.length < 100) {
    return {
      markdown: "",
      wordCount: 0,
      isValid: false,
    };
  }

  const systemPrompt = `Você é um Analista Acadêmico especializado em conversão de documentos PDF para Markdown.
Sua missão é converter texto bruto de PDF em Markdown estruturado de alta qualidade.

Instruções:
1. Preserve headers (# para títulos principais, ## para sub-tópicos, ### para seções menores)
2. Formate tabelas de cronogramas e critérios de pontuação em Markdown
3. Preserve listas de conteúdo programático
4. Remova ruídos: números de página soltos, cabeçalhos repetidos, referências de rodapé
5. Organize conteúdo de forma hierárquica
6. Use negrito para destaque de termos-chave
7. Use citações (>) para definições importantes
8. Retorne APENAS Markdown bem estruturado`;

  const userPrompt = `${title ? `Título: ${title}\n\n` : ""}Texto PDF para converter:

${pdfText.substring(0, 20000)}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      },
    });

    const markdown = response.text;

    if (!markdown || markdown.length < 500) {
      return {
        markdown: "",
        wordCount: 0,
        isValid: false,
      };
    }

    const wordCount = markdown.split(/\s+/).length;

    return {
      markdown,
      wordCount,
      isValid: true,
    };
  } catch (error) {
    console.error("Erro ao converter PDF para Markdown:", error);
    return {
      markdown: "",
      wordCount: 0,
      isValid: false,
    };
  }
}
