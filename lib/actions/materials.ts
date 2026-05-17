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

    // 2. Inicia Transação Atômica no Drizzle (Padrão Sênior Local-First)
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

      // Prepara os chunks para inserção em lote (Bulk Insert)
      if (chunks.length > 0) {
        const chunksToInsert = chunks.map((chunk) => ({
          materialId: newMaterial.id,
          subjectId,
          topicId: editalItemId,
          content: chunk.content,
          originTag: 'Lei', // Classificação inicial padrão, pode ser refinada por IA depois
        }));

        await tx.insert(materialChunks).values(chunksToInsert);
      }

      return newMaterial;
    });

    return actionSuccess(result, 'Material da web garimpado e indexado com sucesso!');
  } catch (error: any) {
    console.error("[Materials-Action] Falha no garimpo:", error.message);
    return actionError(`Erro ao executar migração do Garimpo: ${error.message}`);
  }
}
