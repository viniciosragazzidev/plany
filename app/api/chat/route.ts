import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { studyBenches, subjects, materials, profiles, editalItems, materialChunks, semanticCache } from "@/lib/db/schema";
import { eq, and, inArray, sql, desc, gt } from "drizzle-orm";
import { getEmbedding } from "@/lib/ai-optimizations";

export const maxDuration = 30;

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

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
      messages: any[], 
      benchId: string, 
      selectedSubjectIds?: string[],
      isEditalConsultantMode?: boolean
    } = await req.json();

    const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";

    // 1. Semantic Cache Check
    if (!isEditalConsultantMode && lastUserMessage) {
      const queryEmbedding = await getEmbedding(lastUserMessage);
      
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
        console.log("CACHE HIT (Semantic):", cachedResponse.similarity);
        return NextResponse.json({ content: cachedResponse.response, isCached: true });
      }
    }

    // 2. Buscar Informações Detalhadas da Bancada
    const bench = await db.query.studyBenches.findFirst({
      where: eq(studyBenches.id, benchId),
    });

    if (!bench) {
      return NextResponse.json({ error: "Bancada não encontrada" }, { status: 404 });
    }

    let systemPrompt = "";

    if (isEditalConsultantMode) {
      // --- MODO CONSULTOR DE EDITAL ---
      const editalContent = bench.examNotice || bench.examNoticeRaw || "Conteúdo do edital não disponível.";
      
      systemPrompt = `Você é o CONSULTOR DE EDITAL da plataforma PLANY.
Sua única missão agora é ajudar o candidato a entender o seu edital e o que realmente importa para a aprovação.

HOJE É: ${new Date().toLocaleDateString('pt-BR')}

---

### 🏛️ EDITAL EM CONSULTA:
- **PROVA/CONCURSO:** ${bench.goalName}
- **BANCA:** ${bench.examBoard || "Não informada"}
- **DATA DA PROVA:** ${bench.targetDate}

### 📄 CONTEÚDO DO EDITAL (SUA ÚNICA FONTE):
${editalContent}

---

### 🕹️ DIRETRIZES DO CONSULTOR:
1. **Foco Total no Edital:** Responda apenas com base no edital fornecido. Se o usuário perguntar algo fora do edital, lembre-o que você está no "Modo Consultor de Edital".
2. **Resumos Práticos:** O candidato quer saber o que cai, como cai e quais as regras. Seja direto e use listas/tabelas para facilitar a leitura.
3. **Prazos e Critérios:** Dê atenção especial a datas, critérios de desempate, pesos de cada matéria e regras de eliminação.
4. **Análise Estratégica:** Aponte o que parece ser mais importante com base nos pesos e quantidade de questões informadas.

Idioma: Português do Brasil.`;

    } else {
      // --- MODO TUTOR PADRÃO (RAG CIRÚRGICO) ---
      const queryEmbedding = await getEmbedding(lastUserMessage);

      // Retrieval: Get Top 5 relevant chunks from materials in this bench
      const relevantChunks = await db
        .select({
          content: materialChunks.content,
          materialTitle: materials.title,
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
        .limit(5);

      const contextMaterials = relevantChunks
        .map(c => `--- MATERIAL: ${c.materialTitle} ---\n${c.content}`)
        .join("\n\n");

      const benchSubjects = await db.query.subjects.findMany({
        where: eq(subjects.benchId, benchId)
      });

      systemPrompt = `Você é o PLANY, o parceiro de estudos definitivo e tutor de IA da plataforma.
Sua missão é guiar o usuário rumo à aprovação com foco total nos materiais que ele mesmo subiu.

HOJE É: ${new Date().toLocaleDateString('pt-BR')}

---

### 🏛️ BANCADA ATUAL (OBJETIVO):
- **PROVA/CONCURSO:** ${bench.goalName}
- **BANCA:** ${bench.examBoard || "Não informada"}
- **DATA DA PROVA:** ${bench.targetDate}

### 📄 CONTEÚDO RELEVANTE (RECUPERADO VIA RAG):
${contextMaterials || "Sem conteúdos específicos relevantes encontrados para esta pergunta."}

---

### 🕹️ PERSONALIDADE E DIRETRIZES:
1. **O Material é o Chefe:** Use prioritariamente os trechos de materiais fornecidos acima.
2. **Markdown de Elite:** Use tabelas para comparativos, listas para passos e negrito para termos chave.
3. **Citação Obrigatória:** Sempre cite o nome do material ao usar sua informação.
4. **Resumo:** Se não houver informação nos materiais, use seu conhecimento geral mas avise o usuário.

Idioma: Português do Brasil.`;
    }

    // 3. Formatar Mensagens
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: contents,
      config: {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      }
    });

    const responseText = response.text;

    // 4. Save to Semantic Cache (Async)
    if (!isEditalConsultantMode && lastUserMessage && responseText) {
      const queryEmbedding = await getEmbedding(lastUserMessage);
      db.insert(semanticCache).values({
        benchId,
        query: lastUserMessage,
        queryEmbedding,
        response: responseText,
      }).catch(err => console.error("Erro ao salvar cache semântico:", err));
    }

    return NextResponse.json({ content: responseText });
  } catch (error: any) {
    console.error("Erro na Rota de Chat:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
