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
  const modelName = request.model || "gemini-2.0-flash";

  // Check if request requires Cloud (e.g., contains files/PDFs)
  const hasInlineData = request.contents.some(c => c.parts.some(p => p.inlineData));
  const skipLocal = request.forceCloud || hasInlineData;

  // 1. Try Local AI if configured and not skipped
  if (localAiUrl && !skipLocal) {
    try {
      const systemPrompt = request.config?.systemInstruction?.parts[0]?.text || "";

      const ollamaMessages = [];
      if (systemPrompt) {
        ollamaMessages.push({ role: "system", content: systemPrompt });
      }

      for (const content of request.contents) {
        const textParts = content.parts.map(p => p.text).filter(Boolean).join("\n");
        if (textParts) {
          ollamaMessages.push({
            role: content.role === "model" ? "assistant" : content.role,
            content: textParts
          });
        }
      }

      const ollamaResponse = await fetch(localAiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma2:2b", // Default model for local dev
          messages: ollamaMessages,
          stream: false,
          options: {
            temperature: request.config?.temperature || 0.3
          }
        }),
      });

      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json();
        const resultText = data.message?.content || "";
        console.log("Resposta gerada pelo Ollama Local:", resultText);
        if (resultText) {
          console.log(`[AI-Service] Resposta gerada pelo Ollama Local para o modelo ${modelName}.`);
          return { text: resultText, isLocal: true };
        }
      } else {
        console.warn(`[AI-Service] Ollama retornou status ${ollamaResponse.status}, usando fallback do Gemini.`);
      }
    } catch (ollamaError) {
      console.warn("[AI-Service] Erro ao conectar com o Ollama local, acionando o Gemini automaticamente:", ollamaError);
    }
  }

  // 2. Fallback to Gemini
  const models = [modelName, "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
  let lastError: any;

  for (const mName of models) {
    try {
      const response = await ai.models.generateContent({
        model: mName,
        contents: request.contents as any,
        config: request.config as any
      });

      const text = response.text;
      if (text) return { text, isLocal: false };
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI-Service] Modelo ${mName} falhou:`, err.message);
      if (err.status === 429 || err.status === 404) continue;
      break;
    }
  }

  throw lastError || new Error("IA temporariamente indisponível.");
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  const localAiUrl = process.env.LOCAL_AI_URL;

  if (localAiUrl) {
    try {
      const ollamaUrl = new URL(localAiUrl);
      const embedUrl = `${ollamaUrl.protocol}//${ollamaUrl.host}/api/embeddings`;
      
      const ollamaResponse = await fetch(embedUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "nomic-embed-text", // Standard local embedding model
          prompt: text.substring(0, 8000)
        }),
      });

      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json();
        if (data.embedding) return data.embedding;
      }
    } catch (e) {
      console.warn("[AI-Service] Falha no embedding local, caindo para Gemini.", e);
    }
  }

  const models = ["text-embedding-004", "embedding-001"];
  
  for (const modelName of models) {
    for (let i = 0; i < 2; i++) {
      try {
        const response = await ai.models.embedContent({
          model: modelName,
          contents: text.substring(0, 30000)
        });
        
        if (response.embeddings?.[0]?.values) {
          return response.embeddings[0].values;
        }
      } catch (error: any) {
        if (error.status === 429 && i === 0) {
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        break;
      }
    }
  }
  
  console.warn("[AI-Service] Não foi possível gerar vetores.");
  return null;
}
