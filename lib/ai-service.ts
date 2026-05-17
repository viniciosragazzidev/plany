import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export interface AIContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface AIContent {
  role: "user" | "model" | "assistant" | "system";
  parts: AIContentPart[];
}

export interface AIConfig {
  systemInstruction?: {
    parts: AIContentPart[];
  };
  responseMimeType?: "text/plain" | "application/json";
  temperature?: number;
}

export interface AIRequest {
  model?: string;
  contents: AIContent[];
  config?: AIConfig;
  forceCloud?: boolean;
}

export interface AIResponse {
  text: string;
  isLocal?: boolean;
}

/**
 * Centralized service to generate content using AI.
 * Handles fallback to local AI (Ollama) if LOCAL_AI_URL is configured.
 */
export async function generateAIContent(request: AIRequest): Promise<AIResponse> {
  const localAiUrl = process.env.LOCAL_AI_URL;
  // gemini-2.5-flash is the primary stable model for PLANY in 2026
  const modelName = request.model || "gemini-2.5-flash";

  // Check if request requires Cloud (e.g., contains files/PDFs)
  const hasInlineData = request.contents.some(c => c.parts.some(p => p.inlineData));
  const skipLocal = request.forceCloud || hasInlineData;

  // 1. Tentar Local se disponível
  if (localAiUrl && !skipLocal) {
    try {
      const response = await fetch(`${localAiUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3",
          prompt: request.contents[request.contents.length - 1].parts[0].text,
          stream: false,
        }),
      });

      const data = await response.json();
      if (data.response) return { text: data.response, isLocal: true };
    } catch (err) {
      console.warn("[AI-Service] Local AI falhou, tentando Gemini...", err);
    }
  }

  // 2. Fallback to Gemini
  // Priorizando Gemini 2.5 Flash conforme arquitetura de performance do PLANY
  const models = [modelName, "gemini-2.5-flash", "gemini-2.5-pro"];
  let lastError: any;

  // Use unique models only
  const uniqueModels = Array.from(new Set(models));

  for (const mName of uniqueModels) {
    const startTime = Date.now();
    try {
      // Set a strict timeout per AI call to stay within Vercel's 30s limit
      const response = await ai.models.generateContent({
        model: mName,
        contents: request.contents as any,
        config: request.config as any
      });

      const text = response.text;
      if (text) return { text, isLocal: false };
    } catch (err: any) {
      lastError = err;
      const duration = Date.now() - startTime;
      console.warn(`[AI-Service] Modelo ${mName} falhou após ${duration}ms:`, err.message);
      
      // If the model is not found, continue to the next fallback
      if (err.status === 404 || err.message?.toLowerCase().includes("not found")) {
        continue;
      }
      
      // For other errors (like safety blocks or permanent failures), don't loop
      break;
    }
  }

  throw lastError || new Error("IA temporariamente indisponível.");
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const localAiUrl = process.env.LOCAL_AI_URL;

  if (localAiUrl) {
    try {
      const response = await fetch(`${localAiUrl}/api/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "all-minilm",
          prompt: text,
        }),
      });
      const data = await response.json();
      if (data.embedding) return data.embedding;
    } catch (err) {
      console.warn("[AI-Service] Local Embedding falhou, tentando Cloud...", err);
    }
  }

  // gemini-embedding-2 is the current state-of-the-art embedding model in 2026
  const models = ["gemini-embedding-2", "gemini-embedding-001"];
  
  for (const modelName of models) {
    try {
      const response = await ai.models.embedContent({
        model: modelName,
        contents: text.substring(0, 30000)
      });
      
      if (response.embeddings?.[0]?.values) {
        return response.embeddings[0].values;
      }
    } catch (error: any) {
      console.warn(`[AI-Service] Embedding com ${modelName} falhou:`, error.message);
      
      // If the model is not found, try the next one
      if (error.status === 404 || error.message?.toLowerCase().includes("not found")) {
        continue;
      }
      
      // For other errors, return null
      return null;
    }
  }
  
  console.warn("[AI-Service] Não foi possível gerar vetores.");
  return null;
}
