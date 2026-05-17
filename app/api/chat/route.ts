import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { studyBenches, materials, materialChunks, semanticCache } from "@/lib/db/schema";
import { eq, and, inArray, sql, desc } from "drizzle-orm";
import { getEmbedding } from "@/lib/ai-optimizations";
import { generateAIContent } from "@/lib/ai-service";

export const maxDuration = 30;

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const {
      messages,
      benchId,
      selectedSubjectIds,
      isEditalConsultantMode
    }: {
      messages: ChatMessage[],
      benchId: string,
      selectedSubjectIds?: string[],
      isEditalConsultantMode?: boolean
    } = await req.json();

    const lastUserMessage = messages.filter((m) => m.role === "user").pop()?.content || "";

    // 1. Semantic Cache Check (Graceful)
    let queryEmbedding: number[] | null = null;
    if (!isEditalConsultantMode && lastUserMessage) {
      try {
        queryEmbedding = await getEmbedding(lastUserMessage);

        if (queryEmbedding) {
          const [cachedResponse] = await db
            .select({
              response: semanticCache.response,
              similarity: sql<number>`1 - (${semanticCache.queryEmbedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`
            })
            .from(semanticCache)
            .where(eq(semanticCache.benchId, benchId))
            .orderBy(t => desc(t.similarity))
            .limit(1);

          if (cachedResponse && cachedResponse.similarity > 0.95) {
            return NextResponse.json({ content: cachedResponse.response, isCached: true });
          }
        }
      } catch (embError) {
        console.warn("[Chat] Erro ao buscar cache semântico:", embError);
      }
    }

    // 2. Buscar Informações da Bancada
    const bench = await db.query.studyBenches.findFirst({
      where: eq(studyBenches.id, benchId),
    });

    if (!bench) {
      return NextResponse.json({ error: "Bancada não encontrada" }, { status: 404 });
    }

    let systemPrompt = "";

    if (isEditalConsultantMode) {
      const editalContent = bench.examNotice || bench.examNoticeRaw || "Conteúdo do edital não disponível.";
      systemPrompt = `Você é o CONSULTOR DE EDITAL da plataforma PLANY.
Responda APENAS com base no edital: ${bench.goalName}.
Fonte: ${editalContent}`;
    } else {
      let contextMaterials = "";
      try {
        if (!queryEmbedding) queryEmbedding = await getEmbedding(lastUserMessage);

        if (queryEmbedding) {
          const relevantChunks = await db
            .select({
              content: materialChunks.content,
              materialTitle: materials.title,
              originTag: materialChunks.originTag,
              similarity: sql<number>`1 - (${materialChunks.embedding} <=> ${JSON.stringify(queryEmbedding)}::vector)`
            })
            .from(materialChunks)
            .innerJoin(materials, eq(materialChunks.materialId, materials.id))
            .where(
              and(
                eq(materials.benchId, benchId),
                selectedSubjectIds && selectedSubjectIds.length > 0
                  ? inArray(materials.subjectId, selectedSubjectIds)
                  : undefined
              )
            )
            .orderBy(t => desc(t.similarity))
            .limit(8);

          contextMaterials = relevantChunks
            .map(c => `--- MATERIAL: ${c.materialTitle} ${c.originTag ? `(Natureza: ${c.originTag})` : ""} ---\n${c.content}`)
            .join("\n\n");
        }
      } catch {
        console.warn("[Chat] RAG indisponível, usando conhecimento geral.");
      }

      systemPrompt = `Você é o PLANY, o parceiro de estudos definitivo e tutor de IA da plataforma.
Sua missão é guiar o usuário rumo à aprovação com foco total nos materiais que ele mesmo subiu.

HOJE É: ${new Date().toLocaleDateString('pt-BR')}

---

### 🏛️ BANCADA ATUAL (OBJETIVO):
- **PROVA/CONCURSO:** ${bench.goalName}
- **BANCA:** ${bench.examBoard || "Não informada"}
- **DATA DA PROVA:** ${bench.targetDate}

### 📄 CONTEÚDO RELEVANTE (RECUPERADO VIA RAG):
${contextMaterials || "Nenhum trecho específico foi encontrado nos materiais para esta pergunta."}

${!contextMaterials ? `### 📚 MATERIAIS DISPONÍVEIS NA BANCADA:
${(await db.query.materials.findMany({
        where: and(
          eq(materials.benchId, benchId),
          selectedSubjectIds && selectedSubjectIds.length > 0 ? inArray(materials.subjectId, selectedSubjectIds) : undefined
        ),
        columns: { title: true }
      })).map(m => `- ${m.title}`).join("\n") || "Nenhum material foi carregado ainda."}
` : ""}

---

### 🕹️ PERSONALIDADE E DIRETRIZES:
1. **O Material é o Chefe:** Use prioritariamente os materiais e títulos listados acima.
2. **Priorização Semântica:** Se houver trechos marcados como "Dica" ou "Macete", dê prioridade máxima a eles, pois são as anotações estratégicas do aluno.
3. **Markdown de Elite:** Use tabelas para comparativos, listas para tópicos e negrito para termos chave.
4. **Citação Obrigatória:** Sempre cite o nome do material ao usar sua informação.
5. **Click-to-Explain:** SEMPRE que mencionar um termo técnico, conceito complexo ou tópico do edital, envolva-o em colchetes duplos, assim: **[[Termo Técnico]]**. Isso permitirá que o usuário clique para obter uma explicação detalhada.
6. **Resumo:** Se não houver informação nos materiais, use seu conhecimento acadêmico para explicar, mas avise ao usuário que está complementando o material dele.

Idioma: Português do Brasil.`;
    }

    // 3. Geração de Resposta (Usando Centralized AI Service com Local Fallback)
    let resultText = "";

    try {
      const aiResponse = await generateAIContent({
        model: "gemini-2.0-flash",
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : m.role,
          parts: [{ text: m.content }],
        })) as any,
        config: {
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          temperature: 0.3
        }
      });
      
      resultText = aiResponse.text;
    } catch (error: any) {
      console.error("[Chat] Erro na geração de IA:", error);
      throw error;
    }

    // 4. Cache Semântico (Async)
    if (!isEditalConsultantMode && lastUserMessage && resultText && queryEmbedding) {
      db.insert(semanticCache).values({
        benchId,
        query: lastUserMessage,
        queryEmbedding,
        response: resultText,
      }).catch(e => console.error("[Chat] Erro ao salvar cache:", e));
    }

    return NextResponse.json({ content: resultText });
  } catch (error: any) {
    console.error("[Chat] Erro Fatal:", error);
    return NextResponse.json({ error: "Desculpe, a IA está sobrecarregada. Tente novamente em instantes." }, { status: 500 });
  }
}