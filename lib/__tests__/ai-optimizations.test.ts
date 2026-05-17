import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chunkMarkdown, calculateSimulatedSimilarity, getEmbedding } from '@/lib/services/ai/ai-optimizations';

// Mock do GoogleGenAI
vi.mock('@google/genai', () => {
  const embedContent = vi.fn().mockResolvedValue({
    embeddings: [{ values: [0.1, 0.2, 0.3] }]
  });
  function GoogleGenAI() {
    return {
      models: {
        embedContent
      }
    };
  }
  return { GoogleGenAI };
});

describe('AI Optimizations - Token Preservation', () => {
  
  describe('chunkMarkdown', () => {
    it('deve dividir um texto longo em chunks respeitando o tamanho máximo', () => {
      const longText = "# Título\n" + "Conteúdo ".repeat(100) + "\n## Subtítulo\n" + "Mais conteúdo ".repeat(100);
      const chunks = chunkMarkdown(longText, 500);
      
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0]).toContain("# Título");
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThan(1100); 
      });
    });

    it('deve manter cabeçalhos no início dos chunks quando possível', () => {
      const content = "# Introdução\nTexto breve.\n## Capítulo 1\nTexto longo que deve ser separado.";
      const chunks = chunkMarkdown(content, 50);
      
      expect(chunks[0]).toContain("# Introdução");
      expect(chunks[0]).toContain("Texto breve.");
      expect(chunks.some(c => c.includes("## Capítulo 1"))).toBe(true);
    });
  });

  describe('getEmbedding', () => {
    it('deve chamar a API do Gemini e retornar um vetor de números', async () => {
      const embedding = await getEmbedding("Teste de query");
      expect(embedding).toEqual([0.1, 0.2, 0.3]);
    });
  });

  describe('Semantic Similarity (Mock logic for Cache Hit)', () => {
    it('deve identificar alta similaridade entre vetores idênticos (Simulando Cache Hit > 0.95)', () => {
      const vectorA = [0.1, 0.2, 0.3, 0.4];
      const vectorB = [0.1, 0.2, 0.3, 0.4];
      
      const similarity = calculateSimulatedSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(1.0, 5);
      expect(similarity).toBeGreaterThan(0.95);
    });

    it('deve identificar baixa similaridade entre vetores diferentes (Simulando Cache Miss)', () => {
      const vectorA = [1, 0, 0, 0];
      const vectorB = [0, 1, 0, 0];
      
      const similarity = calculateSimulatedSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0);
      expect(similarity).toBeLessThan(0.95);
    });
  });

});
