import { generateAIContent } from "@/lib/ai-service";

export interface QueryGenInput {
  materia: string;
  topicos: string[];
  editalContent?: string;
}

export interface QueryGenOutput {
  topic: string;
  queries: string[];
}

export interface DiscoveredEditalData {
  metadata: {
    institution: string;
    role: string;
    year: string;
  };
  subjects: string[];
  items: { category: string; topic: string; weight: number }[];
}

export async function researchEmptyEditalTopics(editalContent: string, webContext?: string): Promise<DiscoveredEditalData> {
  const systemPrompt = `Você é um Analista Forense de Editais e Pesquisador Acadêmico de Elite.
O usuário forneceu um fragmento de edital que pode estar incompleto, ou apenas o nome de um concurso. 
Sua missão é reconstruir ou descobrir o CONTEÚDO PROGRAMÁTICO INTEGRAL e os metadados do concurso.

REGRAS RIGOROSAS:
1. METADADOS: Identifique a Instituição (ex: "Polícia Federal"), o Cargo/Role (ex: "Agente de Polícia") e o Ano (ex: "2026").
2. EXAUSTIVIDADE DE MATÉRIAS: Você deve identificar TODAS as disciplinas que o concurso cobra. Não omita nenhuma matéria padrão do cargo.
3. EXAUSTIVIDADE DE TÓPICOS: Para CADA disciplina, gere UMA LISTA EXAUSTIVA de tópicos. Nunca coloque apenas "Geral" ou 2 tópicos se a disciplina for vasta. Detalhe de 10 a 20 tópicos por disciplina se aplicável.
4. PRECISÃO SEMÂNTICA: A 'category' DEVE ser o nome da disciplina (Ex: "Língua Portuguesa"). O 'topic' DEVE ser o assunto específico (Ex: "Crase", "Interpretação de Texto"). Nunca repita o nome da disciplina no tópico.
5. PESQUISA WEB: Se o 'webContext' trouxer o conteúdo real, baseie-se nele estritamente.

${webContext ? `CONTEXTO PESQUISADO NA WEB (FONTE PRIORITÁRIA):\n${webContext}\n` : ""}

Sua resposta deve ser estritamente um JSON válido:
{
  "metadata": {
    "institution": "Polícia Federal",
    "role": "Agente de Polícia",
    "year": "2026"
  },
  "subjects": ["Língua Portuguesa", "Matemática", "Conhecimentos Aquaviários"],
  "items": [
    { "category": "Língua Portuguesa", "topic": "Interpretação de Texto", "weight": 1 },
    { "category": "Língua Portuguesa", "topic": "Crase", "weight": 1 },
    { "category": "Matemática", "topic": "Equações de 2º Grau", "weight": 1 }
  ]
}`;

  const userPrompt = `Contexto/Edital Fornecido:\n\n${editalContent.substring(0, 8000)}\n\nIdentifique o cargo/concurso e gere a lista COMPLETA de matérias e tópicos baseando-se no padrão ouro para este certame. Retorne apenas o JSON estruturado.`;

  try {
    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      forceCloud: true,
      config: {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        responseMimeType: "application/json"
      },
    });

    const text = response.text;
    if (!text) return { metadata: { institution: "", role: "", year: "" }, subjects: [], items: [] };

    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return {
      metadata: parsed.metadata || { institution: "", role: "", year: "" },
      subjects: parsed.subjects || [],
      items: parsed.items || []
    };
  } catch (error) {
    console.error("Erro ao pesquisar tópicos do edital vazio:", error);
    return { metadata: { institution: "", role: "", year: "" }, subjects: [], items: [] };
  }
}

/**
 * Embeleza o título de um material encontrado na web para torná-lo mais acadêmico e legível.
 */
export async function beautifyMaterialTitle(rawTitle: string, topic: string): Promise<string> {
  try {
    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `Você é um Curador de Conteúdo Acadêmico. 
Sua tarefa é limpar e transformar um título de arquivo/página web em um título elegante, profissional e direto para um material de estudo.

Tópico do Assunto: ${topic}
Título Bruto: ${rawTitle}

Regras:
- Remova extensões como .pdf, .docx, .html
- Remova códigos aleatórios, hashes ou sufixos de sistema (ex: ads_123, kakfna...)
- Capitalize corretamente (Iniciais em Maiúsculo)
- Mantenha o título curto e focado no conteúdo (máx 60 caracteres)
- Se o título for irrelevante ou apenas código, gere um título novo baseado no tópico.
- Retorne APENAS o novo título, sem explicações.` }] }],
    });
    return response.text?.trim() || rawTitle;
  } catch (error) {
    console.error("[AI-Beautify] Erro ao embelezar título:", error);
    return rawTitle;
  }
}

export async function generateSearchQueries(
  input: QueryGenInput
): Promise<QueryGenOutput[]> {
  const systemPrompt = `Você é um Analista de Pesquisa Especialista em Google Dorks e Curadoria Acadêmica.
Sua missão é transformar tópicos de conteúdo programático em queries de busca cirúrgicas para encontrar MATERIAIS DE ESTUDO (teoria, resumos, apostilas, artigos, textos explicativos).

IMPORTANTE: Evite ABSOLUTAMENTE resultados irrelevantes como:
- Editais de concursos (listas de matérias sem explicação)
- Páginas de inscrição ou notícias de certames
- Cronogramas ou tabelas de vagas
- Sites de notícias de concursos (ex: PCI Concursos, Folha Dirigida, Gran Cursos, Estratégia)

Queremos o CONTEÚDO para estudar, não a notícia de que o assunto vai cair em uma prova.

Para cada tópico, gere 3 Google Dorks seguindo estes modelos aprimorados:
1. filetype:pdf "[ASSUNTO]" (resumo OR apostila OR teoria OR "conceitos básicos") -edital -concurso -vaga -inscrição -cronograma -resultado -gabarito -folha -pci -vunesp -cespe -fgv
2. site:.edu.br "[ASSUNTO]" (aula OR "notas de aula" OR "material de apoio" OR tutorial OR explicativo) -concurso -vaga -inscrição
3. site:.gov.br "[ASSUNTO]" (manual OR guia OR "legislação comentada" OR "entenda o" OR "sobre o") -concurso -vaga -resultado

Regras:
- Use aspas para termos compostos.
- Use o operador negativo (-) para excluir termos que indicam sites de notícias ou editais.
- Adicione termos qualitativos como "teoria", "explicação", "conceitos", "resumo".
- Foque em encontrar conteúdo didático de alta autoridade (.gov.br, .edu.br, .org).

Retorne APENAS um JSON válido no seguinte formato:
{
  "queries": [
    { "topic": "Nome do Tópico", "queries": ["dork1", "dork2", "dork3"] }
  ]
}`;

  const userPrompt = `Bancada de Estudos: ${input.materia}
Tópicos para Pesquisar: ${input.topicos.join(", ")}

${input.editalContent ? `Referência do Edital (use apenas para contexto de profundidade):\n${input.editalContent.substring(0, 2000)}\n---` : ""}

Gere queries Google Dorks para encontrar materiais de estudo em Português (Brasil).`;

  try {
    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("IA não retornou uma resposta válida. Tente novamente!");

    // Clean JSON response
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return parsed.queries || [];
  } catch (error) {
    console.error("Erro ao gerar queries:", error);
    throw new Error(`Falha ao gerar queries de pesquisa: ${error}`);
  }
}
