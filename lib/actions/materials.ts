'use server';

import { db } from '@/lib/db';
import { materials, materialChunks } from '@/lib/db/schema';
import { scrapeAndProcessSource } from '@/lib/services/infrastructure/web-scraper';

/**
 * Interface unificada para respostas de Server Actions no PLANY.
 */
export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

/**
 * Utilitário para sucesso.
 */
export function actionSuccess<T>(data: T, message: string): ActionResponse<T> {
  return { success: true, data, message };
}

/**
 * Utilitário para erro.
 */
export function actionError(error: string): ActionResponse<any> {
  return { success: false, message: error, error };
}

/**
 * ACTION: Garimpa material da web e persiste os chunks vetorizados no banco.
 * @param url URL capturada pelo mecanismo de busca de dorks.
 * @param benchId ID da bancada ativa.
 * @param subjectId ID da disciplina vinculada na Coluna Esquerda.
 * @param editalItemId ID do tópico específico do edital.
 * @param title Título amigável para o material.
 */
export async function ingestWebMaterialAction(
  url: string,
  benchId: string,
  subjectId: string,
  editalItemId: string,
  title: string
): Promise<ActionResponse<any>> {
  try {
    // 1. Executa a engrenagem do Firecrawl + Tokenizer
    const { markdownCompleto, chunks } = await scrapeAndProcessSource(url);

    // Prepara os chunks para inserção em lote (Bulk Insert) com Vetorização FORA da transação de banco
    const processedChunks: Array<{
      content: string;
      embedding: number[] | null;
      originTag: string;
    }> = [];
    if (chunks.length > 0) {
      const { getEmbedding, classifyChunk } = await import("@/lib/ai-optimizations");
      
      // Process chunks in parallel batches to speed up ingestion
      const batchSize = 5;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (chunk) => {
          try {
            const [embedding, originTag] = await Promise.all([
              getEmbedding(chunk.content),
              classifyChunk(chunk.content)
            ]);
            return { content: chunk.content, embedding, originTag };
          } catch (err) {
            console.error(`[Materials-Action] Erro ao processar chunk:`, err);
            return { content: chunk.content, embedding: null, originTag: "Lei" };
          }
        }));
        processedChunks.push(...results);
      }
    }

    // 2. Inicia Transação Atômica Rápida no Drizzle (Padrão Sênior Local-First)
    const result = await db.transaction(async (tx) => {
      // Cria o registro pai na tabela de materiais
      const [newMaterial] = await tx.insert(materials).values({
        benchId,
        subjectId,
        editalItemId,
        title,
        type: 'link',
        content: markdownCompleto,
        storageUrl: url,
        contentHash: crypto.randomUUID(), // Hash temporário de controle
      }).returning();

      if (processedChunks.length > 0) {
        const chunksToInsert = processedChunks.map((pc) => ({
          materialId: newMaterial.id,
          subjectId,
          topicId: editalItemId,
          content: pc.content,
          embedding: pc.embedding,
          originTag: pc.originTag || 'Lei',
        }));

        await tx.insert(materialChunks).values(chunksToInsert);
      }

      return newMaterial;
    });

    return actionSuccess(result, 'Material da web garimpado e indexado com sucesso!');
  } catch (error: any) {
    console.error("[Materials-Action] Falha no garimpo:", error.message);
    if (error.message?.includes("RESOURCE_EXHAUSTED") || error.message?.includes("spending cap")) {
      return actionError("Sua chave API do Gemini excedeu a cota de uso ou limite financeiro. Por favor, gerencie seus limites no Google AI Studio.");
    }
    return actionError(`Erro ao executar migração do Garimpo: ${error.message}`);
  }
}
