import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export interface QueryGenInput {
  materia: string;
  topicos: string[];
  editalContent?: string;
}

export interface QueryGenOutput {
  topic: string;
  queries: string[];
}

export async function researchEmptyEditalTopics(editalContent: string, webContext?: string): Promise<string[]> {
  const systemPrompt = `Você é um Assistente Especialista em Concursos Públicos e Pesquisa Acadêmica.
O usuário importou um edital (ou parte dele) que NÃO possui o conteúdo programático definido.

Sua tarefa ocorre em DUAS FASES:
Fase 1: Reunir Nome do Concurso, Ano, Data da Prova e Matérias baseando-se no texto fornecido ${webContext ? "E nas informações pesquisadas na web" : ""}.
Fase 2: Atuar como um "Garimpo" (Pesquisador). Para o concurso identificado e as matérias encontradas, VOCÊ DEVE ESTIPULAR/PESQUISAR na sua base de conhecimento qual é o CONTEÚDO PROGRAMÁTICO PADRÃO E ESPERADO. 

${webContext ? `CONTEXTO PESQUISADO NA WEB (Use isso como fonte prioritária):\n${webContext}\n` : ""}

Retorne APENAS um JSON válido contendo uma lista consolidada de tópicos no formato "Matéria: Nome do Tópico".
Exemplo de formato:
{
  "topics": [
    "Língua Portuguesa: Compreensão e interpretação de textos",
    "Direito Administrativo: Atos Administrativos",
    "Informática: Segurança da Informação"
  ]
}`;

  const userPrompt = `Texto do Edital Importado:\n\n${editalContent.substring(0, 5000)}\n\nExtraia os dados (Concurso, Ano, Data, Materias) e, em seguida, liste os conteúdos programáticos para essas matérias. Retorne apenas o JSON com o array 'topics'.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
      },
    });

    const text = response.text;
    if (!text) return [];

    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return parsed.topics || [];
  } catch (error) {
    console.error("Erro ao pesquisar tópicos do edital vazio:", error);
    return [];
  }
}

/**
 * Embeleza o título de um material encontrado na web para torná-lo mais acadêmico e legível.
 */
export async function beautifyMaterialTitle(rawTitle: string, topic: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
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
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Using the available model, user mentioned 1.5 Pro but I see 2.5-flash in bench.ts
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
