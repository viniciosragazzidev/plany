import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateFlashcardsAction, submitFlashcardReviewAction } from '../flashcards';
import { db } from '../../db';

// Helper para criar mocks encadeados que funcionam como Promises (Thenables)
const createMockChain = (finalValue: any) => {
  const mock: any = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    // Implementação de Thenable para que o await funcione corretamente
    then: (onFulfilled: any) => Promise.resolve(finalValue).then(onFulfilled),
    catch: (onRejected: any) => Promise.resolve(finalValue).catch(onRejected),
    finally: (onFinally: any) => Promise.resolve(finalValue).finally(onFinally),
  };
  // Adiciona o marcador de Promise para compatibilidade com algumas libs
  mock[Symbol.toStringTag] = 'Promise';
  return mock;
};

// Mock do Banco de Dados
vi.mock('../../db', () => {
  const mockDb = {
    select: vi.fn(),
    transaction: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    query: {
      subjects: {
        findFirst: vi.fn(),
      },
    },
  };
  return { db: mockDb };
});

// Mock do AI Optimizations
vi.mock('../../services/ai/ai-optimizations', () => ({
  getEmbedding: vi.fn().mockResolvedValue(new Array(3072).fill(0)),
}));

// Mock do AI Service
vi.mock('@/lib/services/ai/ai-service', () => ({
  generateAIContent: vi.fn().mockResolvedValue({
    text: JSON.stringify({
      flashcards: [
        { front: 'Pergunta 1', back: 'Resposta 1' },
        { front: 'Pergunta 2', back: 'Resposta 2' },
      ],
    }),
  }),
}));

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

      (db.select as any).mockImplementation(() => createMockChain([mockCard]));

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
      (db.select as any).mockImplementation(() => createMockChain([{ content: 'Conteúdo de teste para RAG' }]));

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
      
      // No primeiro select (RAG), retorna vazio. No segundo (fallback), também vazio.
      (db.select as any).mockImplementation(() => createMockChain([]));

      const result = await generateFlashcardsAction('bench1', 'sub1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Nenhum material encontrado');
    });
  });
});
