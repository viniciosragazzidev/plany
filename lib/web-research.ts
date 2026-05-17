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
    contestName: string;
  };
  subjects: string[];
  items: { category: string; topic: string; weight: number }[];
}

export async function researchEmptyEditalTopics(editalContent: string, webContext?: string): Promise<DiscoveredEditalData> {
  const currentDate = new Date().toLocaleDateString('pt-BR');
  
  const systemPrompt = `Você é um Especialista em Inteligência de Editais e Curadoria de Concursos.
Sua missão é identificar o concurso e extrair o conteúdo programático OFICIAL e ATUALIZADO.

REGRAS DE VALIDAÇÃO E PRECISÃO:
1. IDENTIFICAÇÃO: Se o concurso for um CFAQ (Moço de Convés/Máquinas), saiba que o padrão oficial da Marinha cobra APENAS Língua Portuguesa e Matemática (Nível Fundamental). Remova quaisquer matérias como Inglês ou Física a menos que o texto fornecido diga explicitamente o contrário.
2. DATA ATUAL: Hoje é ${currentDate}. Priorize informações de editais vigentes (2024-2026) e ignore provas antigas que não servem mais de base.
3. CONTEST_NAME: Gere um nome descritivo e bonito (ex: "Processo Seletivo CFAQ-MOC 2026").
4. EXAUSTIVIDADE: Detalhe os tópicos internos de cada matéria (mínimo 10 tópicos por disciplina).
5. FILTRAGEM: Remova matérias "alucinadas" ou que pertençam a outros cargos do mesmo órgão (ex: não misture matérias de Oficial com as de Praça).

${webContext ? `CONTEXTO PESQUISADO NA WEB (FONTE PRIORITÁRIA):\n${webContext}\n` : ""}

Sua resposta deve ser estritamente um JSON válido:
{
  "metadata": {
    "institution": "Ex: Marinha do Brasil",
    "role": "Ex: Moço de Convés",
    "year": "2026",
    "contestName": "Nome Completo do Concurso"
  },
  "subjects": ["Disciplina 1", "Disciplina 2"],
  "items": [
    { "category": "Disciplina 1", "topic": "Assunto Específico", "weight": 1 }
  ]
}`;

  try {
    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ 
        role: "user", 
        parts: [{ text: `CONTEÚDO DO EDITAL:\n\n${editalContent.substring(0, 15000)}` }] 
      }],
      config: {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        responseMimeType: "application/json"
      }
    });

    return JSON.parse(response.text.replace(/```json/g, "").replace(/```/g, "").trim());
  } catch (error) {
    console.error("Erro na pesquisa de tópicos vazios:", error);
    throw new Error("Falha ao reconstruir edital.");
  }
}

export async function beautifyMaterialTitle(rawTitle: string, topic: string): Promise<string> {
  try {
    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ 
        role: "user", 
        parts: [{ text: `O tópico de estudo é: "${topic}"
Título original do arquivo/site: "${rawTitle}"

Gere um título amigável e profissional seguindo estas regras:
- Máximo 60 caracteres.
- Remova extensões de arquivo (.pdf, .html).
- Seja descritivo sobre o conteúdo (ex: "Resumo Completo de Crase", "Exercícios de Equações").
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

REGRAS DE ISOLAMENTO POR MATÉRIA:
1. ÂNCORA DE CONTEXTO: Você deve ancorar TODAS as queries à matéria principal. 
   - Se a matéria for "Língua Portuguesa", todas as buscas devem ser sobre gramática, literatura ou interpretação de texto.
   - Jamais permita que termos de Matemática (juros, porcentagem, equações) vazem para uma busca de Português, mesmo que o tópico pareça genérico.
   - Use palavras de reforço da disciplina (ex: "em português", "gramática", "teoria da língua").

2. EXCLUSÃO DE RUÍDO (CRÍTICO): Evite ABSOLUTAMENTE resultados irrelevantes como:
   - Editais de concursos (listas de matérias sem explicação)
   - Ementas escolares, matrizes curriculares, grades de curso, programas ou cronogramas de aula estruturais (ex: páginas que apenas listam o que será estudado por 1º Bimestre, 2º Bimestre, Série, etc., sem explicar o conteúdo real).
   - Páginas de inscrição ou notícias de certames
   - Cronogramas ou tabelas de vagas
   - Sites de notícias de concursos (ex: PCI Concursos, Folha Dirigida, Gran Cursos, Estratégia)

3. MODELOS DE DORKS EXCLUSIVOS (Gere 3 por tópico contendo exclusões obrigatórias):
   1. filetype:pdf "[MATÉRIA]" "[TÓPICO]" (resumo OR apostila OR teoria) -edital -concurso -inscrição -cronograma -pci -gran -estratégia -ementa -currículo -curriculo -"conteúdo programático" -"conteudo programatico" -bimestre
   2. site:.edu.br "[MATÉRIA]" "[TÓPICO]" (aula OR "notas de aula" OR tutorial OR explicativo) -vaga -resultado -ementa -currículo -curriculo -"conteúdo programático" -"conteudo programatico" -bimestre
   3. site:.gov.br "[MATÉRIA]" "[TÓPICO]" (manual OR guia OR "entenda o" OR "sobre o") -cronograma -gabarito -ementa -currículo -curriculo -"conteúdo programático" -"conteudo programatico" -bimestre

Retorne APENAS um JSON válido no seguinte formato:
{
  "queries": [
    { "topic": "Nome do Tópico", "queries": ["dork1", "dork2", "dork3"] }
  ]
}`;

  const userPrompt = `DISCIPLINA PRINCIPAL: ${input.materia}
TÓPICOS ESPECÍFICOS: ${input.topicos.join(", ")}

${input.editalContent ? `Referência do Edital:\n${input.editalContent.substring(0, 2000)}\n---` : ""}

Gere queries Google Dorks cirúrgicas para encontrar materiais didáticos em Português (Brasil). Garanta o isolamento total da disciplina "${input.materia}".`;

  try {
    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        responseMimeType: "application/json"
      }
    });

    const jsonStr = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    return parsed.queries || [];
  } catch (error) {
    console.error("Erro ao gerar queries:", error);
    throw new Error(`Falha ao gerar queries de pesquisa: ${error}`);
  }
}
