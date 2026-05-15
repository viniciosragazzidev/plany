import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { studyBenches, subjects, materials, profiles, editalItems } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { differenceInDays } from "date-fns";

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

    // 1. Buscar Informações Detalhadas da Bancada
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
      // --- MODO TUTOR PADRÃO (LOGICA EXISTENTE) ---
      // Determine which subjects to show as context
      const benchSubjects = await db.query.subjects.findMany({
        where: selectedSubjectIds && selectedSubjectIds.length > 0
          ? and(eq(subjects.benchId, benchId), inArray(subjects.id, selectedSubjectIds))
          : eq(subjects.benchId, benchId),
      });

      const subjectIds = benchSubjects.map(s => s.id);

      // Fetch edital items for these subjects
      const benchEditalItems = await db.query.editalItems.findMany({
        where: eq(editalItems.benchId, benchId),
      });

      // Filter edital items that match the selected subjects
      const filteredEditalItems = benchEditalItems.filter(item => 
        benchSubjects.some(s => 
          item.category.toLowerCase().includes(s.title.toLowerCase()) || 
          s.title.toLowerCase().includes(item.category.toLowerCase())
        )
      );

      // Fetch materials for these subjects
      const benchMaterials = await db
        .select({
          id: materials.id,
          title: materials.title,
          type: materials.type,
          content: materials.content,
          subjectId: materials.subjectId,
          editalItemId: materials.editalItemId,
        })
        .from(materials)
        .where(
          selectedSubjectIds && selectedSubjectIds.length > 0
            ? and(eq(materials.benchId, benchId), inArray(materials.subjectId, selectedSubjectIds))
            : eq(materials.benchId, benchId)
        );

      // 2. Preparar Contexto Detalhado (ESTRUTURADO)
      const today = new Date();
      
      // Build a structured tree for the AI
      const contextTree = benchSubjects.map(subject => {
        const subjectTopics = filteredEditalItems.filter(item => 
          item.category.toLowerCase().includes(subject.title.toLowerCase()) || 
          subject.title.toLowerCase().includes(item.category.toLowerCase())
        );

        const subjectMaterials = benchMaterials.filter(m => m.subjectId === subject.id);

        return {
          subject: subject.title,
          priority: subject.priority,
          topics: subjectTopics.map(t => ({
            name: t.topic,
            description: t.description,
            isCovered: t.isCovered,
            materials: subjectMaterials.filter(m => m.editalItemId === t.id).map(m => m.title)
          })),
          generalMaterials: subjectMaterials.filter(m => !m.editalItemId).map(m => m.title)
        };
      });

      const materialContents = benchMaterials
        .filter(m => m.content)
        .map(m => {
          const subject = benchSubjects.find(s => s.id === m.subjectId);
          return `--- MATERIAL: ${m.title} (${subject?.title || "Geral"}) ---\n${m.content}\n--- FIM DO MATERIAL ---`;
        })
        .join("\n\n");

      const contextStatus = selectedSubjectIds && selectedSubjectIds.length > 0
          ? `FOCO ATIVO: O usuário selecionou especificamente as seguintes matérias: ${benchSubjects.map(s => s.title).join(", ")}. 
             Dê prioridade total a esses assuntos e seus respectivos materiais.`
          : "CONTEXTO AMPLO: O usuário está visualizando todas as matérias da bancada.";

      systemPrompt = `Você é o PLANY, o parceiro de estudos definitivo e tutor de IA da plataforma.
Sua missão é guiar o usuário rumo à aprovação com foco total nos materiais que ele mesmo subiu.

HOJE É: ${today.toLocaleDateString('pt-BR')}

---

### 🏛️ BANCADA ATUAL (OBJETIVO):
- **PROVA/CONCURSO:** ${bench.goalName}
- **BANCA:** ${bench.examBoard || "Não informada"}
- **DATA DA PROVA:** ${bench.targetDate}

### 🟢 STATUS DO CONTEXTO (O QUE O USUÁRIO ESTÁ VENDO AGORA):
${contextStatus}

### 📚 ESTRUTURA DE ESTUDOS (SUA FONTE DE VERDADE):
${JSON.stringify(contextTree, null, 2)}

### 📄 CONTEÚDO DOS MATERIAIS (BASE PARA RESPOSTAS):
${materialContents || "Sem conteúdos específicos carregados para o contexto atual."}

---

### 🕹️ PERSONALIDADE E DIRETRIZES:
1. **Diferencie Matéria de Assunto:** Uma "Matéria" (ex: Português) contém vários "Assuntos" (ex: Concordância). Quando o usuário perguntar quais assuntos ele tem selecionado, liste os Assuntos (topics) dentro das Matérias (subjects) que estão no Foco Ativo.
2. **O Material é o Chefe:** Use prioritariamente o conteúdo dos materiais. Se não houver material sobre um assunto, avise e ofereça usar seu conhecimento geral.
3. **Markdown de Elite:** Use tabelas para comparativos, listas para passos e negrito para termos chave.
4. **Citação Obrigatória:** Sempre cite o nome do material ao usar sua informação.

Idioma: Português do Brasil.`;
    }

    // 3. Formatar Mensagens (Garantindo que o Gemini entenda o histórico e o sistema)
    // O novo SDK @google/genai espera objetos estruturados
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Chamada ajustada para o novo SDK garantir que a systemInstruction seja lida
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: contents,
      config: {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        }
      }
    });

    return NextResponse.json({ content: response.text });
  } catch (error: any) {
    console.error("Erro na Rota de Chat:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
