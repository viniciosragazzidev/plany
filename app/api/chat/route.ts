import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { studyBenches, subjects, materials, profiles } from "@/lib/db/schema";
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
    const { messages, benchId, selectedSubjectIds }: { messages: any[], benchId: string, selectedSubjectIds?: string[] } = await req.json();

    // 1. Buscar Informações Detalhadas da Bancada
    const bench = await db.query.studyBenches.findFirst({
      where: eq(studyBenches.id, benchId),
    });

    if (!bench) {
      return NextResponse.json({ error: "Bancada não encontrada" }, { status: 404 });
    }

    // Buscar Perfil do Usuário para mais contexto
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, bench.profileId),
    });

    // Determine which subjects to show as context
    const benchSubjects = await db.query.subjects.findMany({
      where: selectedSubjectIds && selectedSubjectIds.length > 0
        ? and(eq(subjects.benchId, benchId), inArray(subjects.id, selectedSubjectIds))
        : eq(subjects.benchId, benchId),
    });

    // Determine which materials to fetch based on user selection
    const benchMaterials = await db
      .select({
        title: materials.title,
        type: materials.type,
        content: materials.content,
        subjectTitle: subjects.title,
      })
      .from(materials)
      .innerJoin(subjects, eq(materials.subjectId, subjects.id))
      .where(
        selectedSubjectIds && selectedSubjectIds.length > 0
          ? and(eq(subjects.benchId, benchId), inArray(materials.subjectId, selectedSubjectIds))
          : eq(subjects.benchId, benchId)
      );

    // 2. Preparar Contexto Detalhado (REFORÇADO)
    const today = new Date();
    const targetDate = new Date(bench.targetDate);
    const daysLeft = differenceInDays(targetDate, today);
    
    const subjectsList = benchSubjects.map(s => `- ${s.title} (Prioridade: ${s.priority}/5)`).join("\n");
    const materialContents = benchMaterials
      .filter(m => m.content)
      .map(m => `--- MATERIAL: ${m.title} (${m.subjectTitle}) ---\n${m.content}\n--- FIM DO MATERIAL ---`)
      .join("\n\n");

const contextStatus = selectedSubjectIds && selectedSubjectIds.length > 0
    ? `FOCO ATIVO: O usuário selecionou especificamente as seguintes disciplinas: ${benchSubjects.map(s => s.title).join(", ")}. 
       IGNORE qualquer conteúdo fora deste escopo selecionado.`
    : "CONTEXTO AMPLO: O usuário está visualizando todas as disciplinas disponíveis.";

const systemPrompt = `Você é o PLANY, o parceiro de estudos definitivo e tutor de IA da plataforma.
Sua missão é guiar o usuário rumo à aprovação com foco total nos materiais que ele mesmo subiu.

HOJE É: ${today.toLocaleDateString('pt-BR')}

---

### 🟢 STATUS DO CONTEXTO ATUAL:
${contextStatus}

### 📚 FONTE ÚNICA DE VERDADE:
- **DISCIPLINAS NO RADAR:** ${subjectsList || "Nenhuma disciplina cadastrada."}
- **BIBLIOTECA DE CONTEÚDOS (MARKDOWN):** ${materialContents || "Sem materiais para as disciplinas focadas."}
- **REGRAS DO JOGO (EDITAL):** ${bench.examNotice || "Edital ainda não importado."}

---

### 🕹️ PERSONALIDADE E ESTILO (VIBE PLANY):
1. **Papo Reto e Despojado:** Fale de forma simples, como um colega de estudos que manja muito do assunto. Use humor leve para quebrar o peso dos estudos.
2. **Tradutor de "Grego":** Encontrou um termo difícil (juridiquês, tecnicismos, acadêmicos)? Explique na hora com uma analogia simples. Ex: "Vetorização é como a IA criando um mapa de biblioteca pra achar o livro certo em segundos".
3. **Mestre do Markdown:** Use títulos, negritos, tabelas e listas. Transforme paredes de texto em algo que o usuário consiga "escanear" com os olhos[cite: 1].
4. **Respeito aos Tokens:** Seja direto[cite: 1]. Se puder explicar em 3 tópicos, não use 10. Economize o fôlego (e os créditos da API)[cite: 1].

### ⚖️ DIRETRIZES RÍGIDAS DE ATUAÇÃO:
1. **O Material é o Chefe:** Se a resposta está no material fornecido, você ESTÁ PROIBIDO de usar conhecimento externo[cite: 1]. 
2. **Sinceridade Acima de Tudo:** Se o assunto não está nos materiais selecionados, diga: "Olha, esse tópico não está nos materiais dessas matérias que você selecionou agora. Quer que eu use meu conhecimento geral ou você prefere subir um material novo sobre isso?"[cite: 1]
3. **Citação de Origem:** Sempre indique de onde veio a info (ex: "Conforme o material [Título]..."). Sem fonte, sem ponto[cite: 1].
4. **Identidade Própria:** Você é o Plany. Você não é um modelo do Google, nem da OpenAI[cite: 1]. Você é o cérebro da plataforma.
5. **Saúde Mental e Sprints:** Se a conversa estiver longa, sugira um 'Sprint de Descanso'. Ex: "Você já mandou ver em 5 tópicos! Que tal 5 min de café pra resetar o cérebro?"[cite: 1]

### 🛠️ EXEMPLOS DE ANALOGIAS PARA USAR:
- **Edital:** "É o arquivo de configuração (.env) da sua aprovação: se ignorar uma linha, o sistema não roda."
- **Revisão:** "É como dar um 'git commit' no conhecimento: se não fizer, você perde o que produziu."
- **Flashcards:** "São os testes unitários do seu cérebro."

Idioma: Português do Brasil.`;

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
