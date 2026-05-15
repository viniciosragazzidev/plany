import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateFlashcardsAction, submitFlashcardReviewAction } from '../flashcards';
import { db } from '../../db';

// Mock do Banco de Dados
vi.mock('../../db', () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    query: {
      subjects: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// Mock do AI Optimizations
vi.mock('../../ai-optimizations', () => ({
  getEmbedding: vi.fn().mockResolvedValue(new Array(3072).fill(0)),
}));

// Mock do Google GenAI
vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function() {
      return {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: JSON.stringify({
              flashcards: [
                { front: 'Pergunta 1', back: 'Resposta 1' },
                { front: 'Pergunta 2', back: 'Resposta 2' },
              ],
            }),
          }),
          embedContent: vi.fn().mockResolvedValue({
            embedding: { values: new Array(3072).fill(0) }
          })
        }
      };
    }),
  };
});

// Mock do Next Cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Flashcards Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SM-2 Algorithm', () => {
    it('deve atualizar corretamente um flashcard com performance 5 (Fácil)', async () => {
      const mockCard = {
        id: '1',
        easeFactor: '2.5',
        interval: 0,
        repetitions: 0,
        nextReviewAt: new Date(),
      };

      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockCard]),
        }),
      });

      (db.transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue({}),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue({}),
          }),
        };
        return await callback(tx);
      });

      const result = await submitFlashcardReviewAction('1', 5);
      expect(result.success).toBe(true);
      expect(result.nextReview).toBeInstanceOf(Date);
    });
  });

  describe('Flashcard Generation (RAG)', () => {
    it('deve gerar flashcards com sucesso quando material é encontrado', async () => {
      // Mock subject
      (db.query.subjects.findFirst as any).mockResolvedValue({ id: 'sub1', title: 'Direito' });

      // Mock chunks retrieval
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ content: 'Conteúdo de teste para RAG' }]),
              }),
            }),
          }),
        }),
      });

      // Mock transaction for saving cards
      (db.transaction as any).mockImplementation(async (callback: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 'card1' }]),
            }),
          }),
        };
        return await callback(tx);
      });

      const result = await generateFlashcardsAction('bench1', 'sub1');

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
    });

    it('deve falhar se nenhum material for encontrado', async () => {
      (db.query.subjects.findFirst as any).mockResolvedValue({ id: 'sub1', title: 'Direito' });
      (db.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]), // Nenhum chunk
              }),
            }),
          }),
        }),
      });

      const result = await generateFlashcardsAction('bench1', 'sub1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Nenhum material encontrado');
    });
  });
});
