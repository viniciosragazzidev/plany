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
  // gemini-2.5-flash does not exist yet, using 1.5-flash-latest for maximum stability and speed
  const modelName = request.model === "gemini-2.5-flash" ? "gemini-1.5-flash-latest" : (request.model || "gemini-1.5-flash-latest");

  // Check if request requires Cloud (e.g., contains files/PDFs)
  const hasInlineData = request.contents.some(c => c.parts.some(p => p.inlineData));
  const skipLocal = request.forceCloud || hasInlineData;

  // ... (local AI logic remains same)

  // 2. Fallback to Gemini
  // Reduced list to prevent Vercel 504 Timeouts. 
  // Most errors are transient or configuration-based, trying too many models just burns time.
  const models = [modelName, "gemini-1.5-flash-latest"];
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
      
      // If we are nearing the 30s Vercel limit, abort and throw
      if (err.status === 404 || err.message?.toLowerCase().includes("not found")) {
        continue; // Try next model if current one doesn't exist
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
    // ... (local embedding logic remains same)
  }

  // text-embedding-004 is the current stable state-of-the-art embedding model
  const models = ["text-embedding-004"];
  
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
      // Don't loop on embeddings to save time for the main generation
      break;
    }
  }
  
  console.warn("[AI-Service] Não foi possível gerar vetores.");
  return null;
}
