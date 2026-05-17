# Mapa de Funcionalidades & Serviços do PLANY 🛠️

Este documento detalha todas as funcionalidades vitais do **PLANY** em 2026, com foco na experiência prática do usuário (Exemplos de Uso) e mapeamento exato das Server Actions e caminhos de arquivo no ecossistema.

---

## 1. Módulo: Upload & Ingestão de Editais (Garimpo de Editais)

Este módulo é responsável por ingerir o edital PDF carregado pelo usuário, realizar a deduplicação inteligente em cache em background e estruturar a taxonomia de matérias e tópicos.

*   **O que faz por baixo dos panos:**
    1.  Lê o arquivo PDF e reconstrói as coordenadas textuais para preservar a semântica de linhas e tabelas.
    2.  Tokeniza e fatiará o texto utilizando o processador do sistema.
    3.  Extrai metadados essenciais (Órgão, Cargo, Ano) usando [analyzeEditalMetadata](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/public-edital.ts#L108).
    4.  Realiza a deduplicação de 3 camadas via [checkExistingEdital](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/public-edital.ts#L156).
    5.  Se houver *Cache Hit*, clona a estrutura pública a custo zero de IA usando [selectPublicEdital](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/public-edital.ts#L43).
    6.  Se houver *Cache Miss*, processa o edital via Gemini 2.5 Flash, indexa publicamente no banco e vincula privadamente na bancada usando [parseAndIndexEdital](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/public-edital.ts#L238).

*   **Exemplo de Uso pelo Cliente:**
    O concurseiro arrasta e solta o arquivo `Edital_Marinha_CFAQ_2026.pdf` na área de criação de bancada. O sistema instantaneamente reconhece que o edital já foi processado por outro usuário globalmente e importa todas as 3 matérias e 24 assuntos em **menos de 1 segundo**, sem gastar tokens.

*   **Referências de Código:**
    *   Server Action Principal: [processEditalPDF](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/bench.ts#L29)
    *   Server Action de Onboarding: [extractBenchDataFromEdital](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/bench.ts#L103)
    *   Serviço de Extração Física: [pdf-extractor.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/pdf-extractor.ts)
    *   Lógica de Cache e Clonagem: [public-edital.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/public-edital.ts)

---

## 2. Módulo: Lógica e Estado do Garimpo (Descoberta)

Responsável por garantir que bancadas sem editais cadastrados possam ter suas ementas descobertas a partir de pesquisas automatizadas na web, mapeando tópicos oficiais.

*   **O que faz por baixo dos panos:**
    1.  Valida se a bancada já possui matérias e tópicos estruturados ou se tem um edital pendente usando [validateGarimpoState](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/garimpo.ts#L23).
    2.  Pesquisa no Google (Dorks exaustivos) usando scraper web.
    3.  A IA analisa o contexto coletado e o nome do objetivo do aluno e gera uma lista refinada de disciplinas e tópicos usando [researchEmptyEditalTopics](file:///c:/Users/kyper/Desktop/Projects/plany/lib/web-research.ts#L74).
    4.  Oferece os tópicos sugeridos para o usuário marcar e confirma a criação rápida em massa com [bulkCreateTopicsAction](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/garimpo.ts#L198).

*   **Exemplo de Uso pelo Cliente:**
    O usuário cria uma bancada "Concurso Caixa - T.I." mas não tem o arquivo PDF em mãos. Ele clica em **"Garimpar Ementa"**. O sistema faz uma pesquisa automatizada na web, localiza o conteúdo programático mais recente do concurso Caixa, e exibe uma lista de caixas de seleção com disciplinas como *Banco de Dados* e *Estruturas de Dados*. O usuário seleciona quais quer estudar e clica em "Salvar".

*   **Referências de Código:**
    *   Camada de Orquestração: [garimpo.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/garimpo.ts)
    *   Algoritmos de Pesquisa de Ementas: [web-research.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/web-research.ts)

---

## 3. Módulo: Adição & Vetorização de Materiais de Estudo

Permite adicionar documentos em texto, links externos ou PDFs que servirão de base para o estudo da disciplina selecionada, automatizando o pipeline de vetorização para uso em RAG.

*   **O que faz por baixo dos panos:**
    1.  Caso o material seja PDF, extrai e sanitiza o texto localmente.
    2.  O texto é fatiado inteligentemente por cabeçalhos usando [chunkMarkdown](file:///c:/Users/kyper/Desktop/Projects/plany/lib/ai-optimizations.ts#L16).
    3.  Gera embeddings vetoriais com o modelo `gemini-embedding-2` usando [generateEmbedding](file:///c:/Users/kyper/Desktop/Projects/plany/lib/ai-service.ts#L110).
    4.  Classifica cada trecho de texto por tag semântica ("Dica", "Exemplo", "Lei", "Macete") em [classifyChunk](file:///c:/Users/kyper/Desktop/Projects/plany/lib/ai-optimizations.ts#L57) para consultas contextuais precisas.
    5.  Salva os dados nas tabelas `materials` e `materialChunks`.

*   **Exemplo de Uso pelo Cliente:**
    O aluno envia o arquivo de slides `Aula_01_Atos_Administrativos.pdf` para a disciplina de *Direito Administrativo*. Após o upload, um glow azul pisca ao lado do arquivo indicando que ele foi "Vetorizado e Memorizado". A partir desse momento, qualquer dúvida tirada no Chat utilizará o conteúdo desse arquivo como contexto.

*   **Referências de Código:**
    *   Server Action de Ingestão: [addMaterial](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/bench.ts#L270)
    *   Serviço de IA de Vetorização: [ai-optimizations.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/ai-optimizations.ts)

---

## 4. Módulo: Cadernos Rich-Text Inteligentes (TipTap Notes)

O espaço pessoal de anotações do estudante, integrado diretamente com a inteligência do sistema.

*   **O que faz por baixo dos panos:**
    1.  Armazena as anotações do editor rich-text em banco de dados (`materials` com o tipo `anotacao`).
    2.  O texto em JSON emitido pelo TipTap é processado e agrupado em blocos inteligentes estruturados de cabeçalho e tamanho usando [updateAnotacaoContent](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/cadernos.ts#L80).
    3.  Atualiza os chunks vetoriais do caderno a cada alteração de conteúdo (apenas se houver mudança de SHA-256 no hash do texto), garantindo RAG sempre atualizado em background.

*   **Exemplo de Uso pelo Cliente:**
    O aluno abre o **Caderno de Estudos** de *Língua Portuguesa*, digita suas próprias anotações sobre sintaxe e formata em títulos e listas. Enquanto ele escreve, o sistema vetoriza suas anotações no banco, integrando o próprio resumo do estudante às bases de conhecimento que o chatbot lê.

*   **Referências de Código:**
    *   Server Action de Persistência & Vetorização de Notas: [cadernos.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/cadernos.ts)

---

## 5. Módulo: Flashcards Inteligentes (Algoritmo SM-2)

Sistema de memorização por repetição espaçada integrado ao conteúdo dos materiais de estudo do próprio aluno.

*   **O que faz por baixo dos panos:**
    1.  Realiza a busca vetorial por relevância RAG trazendo os 10 chunks mais aderentes ao tema do flashcard requisitado usando [getEmbedding](file:///c:/Users/kyper/Desktop/Projects/plany/lib/ai-optimizations.ts#L7).
    2.  Chama a IA para gerar 10 flashcards no formato JSON estruturado com perguntas (`front`) e respostas (`back`).
    3.  Calcula dinamicamente a próxima revisão do card baseada na nota do aluno (0 a 5) seguindo a risca a fórmula matemática **SM-2** em [submitFlashcardReviewAction](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/flashcards.ts#L126).
    4.  Entrega para estudo os flashcards que venceram o tempo de intervalo em [getFlashcardsForReviewAction](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/flashcards.ts#L186).

*   **Exemplo de Uso pelo Cliente:**
    O estudante escolhe a disciplina *Matemática* e clica em **"Gerar Flashcards"**. A IA cria 10 cartões (Ex: Front: "Qual a fórmula da progressão aritmética?", Back: "an = a1 + (n-1)*r"). Ele treina e marca que o cartão foi "Fácil" (nota 5). O sistema agenda a reapresentação do cartão para dali a 6 dias. Outro cartão marcado como "Esqueci" (nota 1) volta para a pilha para ser revisado no dia seguinte.

*   **Referências de Código:**
    *   Server Actions e Motor SM-2: [flashcards.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/flashcards.ts)

---

## 6. Módulo: Simulados e Quizzes Contextuais

Criação de simulados dinâmicos e testes baseados estritamente nas matérias e nos tópicos estudados.

*   **O que faz por baixo dos panos:**
    1.  Recupera cirurgicamente as 15 fatias de conhecimento mais relevantes utilizando o RAG pgvector no banco.
    2.  O Gemini 2.5 Flash monta 10 questões inéditas de múltipla escolha com 4 opções, incluindo uma justificativa detalhada para o gabarito.
    3.  Registra as respostas marcadas e o nível de confiança do aluno ("Certo", "Duvidoso", "Chutando") via [submitQuizAnswerAction](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/quiz.ts#L157).
    4.  Salva o resultado final percentual na tabela `quizzes` com [finishQuizAction](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/quiz.ts#L185).

*   **Exemplo de Uso pelo Cliente:**
    O aluno seleciona os tópicos "Crimes contra a Administração Pública" e clica em **"Gerar Simulado"**. Ele responde às 10 questões de múltipla escolha e marca em cada uma o seu nível de certeza. Ao final, ele vê que acertou 80% das questões, mas a análise do sistema avisa que 3 das questões corretas foram marcadas como "Duvidoso", revelando falhas de fixação.

*   **Referências de Código:**
    *   Geração, Tentativas e Resultados: [quiz.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/quiz.ts)

---

## 7. Módulo: Resumos Estruturados 2.0 (Tutor Simplificado)

Funcionalidade que permite condensar múltiplos PDFs e anotações densas em resumos amigáveis, com analogias simples do cotidiano e dicas para provas.

*   **O que faz por baixo dos panos:**
    1.  Gera um hash dos materiais selecionados para checar se o resumo já foi gerado anteriormente (garantindo Custo 0 de IA se já existir).
    2.  Processa os textos das fontes e orquestra o prompt pedagógico via Gemini 2.5 Flash.
    3.  A IA retorna um JSON contendo uma linha do tempo estruturada com: Conceito Simplificado, Analogia do Cotidiano e "Dica de Mestre".
    4.  Permite o salvamento físico no banco (`summaries`) e a exportação direta para o caderno em formato Markdown usando [exportSummaryToNotebookAction](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/summaries.ts#L143).

*   **Exemplo de Uso pelo Cliente:**
    O aluno seleciona dois capítulos gigantescos de economia em PDF e clica em **"Gerar Resumo"**. O sistema entrega um layout interativo de cards estruturados explicando conceitos difíceis. Para o conceito de "Inflação", exibe a analogia: *"Imagine que a inflação é como colocar fermento demais em um bolo de aniversário: a massa cresce muito, mas o sabor continua sendo para o mesmo número de convidados..."*. O aluno clica em "Salvar no Caderno" e o resumo vira uma nota editável.

*   **Referências de Código:**
    *   Server Action de Resumos: [summaries.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/summaries.ts)

---

## 8. Módulo: Scanner de Imagens Acadêmico (OCR Multimodal)

Scanner embutido para converter imagens de anotações físicas de papel ou capturas de tela em Markdown estruturado para estudo.

*   **O que faz por baixo dos panos:**
    1.  Consome arquivos de imagens (PNG/JPEG) enviados pelo usuário e converte em Base64.
    2.  Alimenta diretamente as capacidades multimodais nativas do Gemini 2.5 Flash no [ai-service.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/ai-service.ts#L43).
    3.  Sanitiza e formata a saída em Markdown limpo, respeitando quebras e regras de marcação restritas.

*   **Exemplo de Uso pelo Cliente:**
    O aluno tira uma foto com o celular de uma página de seu caderno de papel onde anotou fórmulas de química orgânica. Ele sobe a foto no PLANY e clica em **"Scanner OCR"**. Em segundos, as anotações manuscritas viram um texto em Markdown editável e limpo, pronto para ser copiado ou salvo em seus cadernos digitais.

*   **Referências de Código:**
    *   Server Action de OCR: [ocr.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/ocr.ts)

---

## 9. Módulo: Crawler e Processador de Conteúdo Web

A infraestrutura que permite capturar páginas da web e formatá-las estritamente em ementas estruturadas, alimentando o banco.

*   **O que faz por baixo dos panos:**
    1.  Realiza a raspagem completa de URLs externas utilizando integração com `Firecrawl` no [web-scraper.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/services/infrastructure/web-scraper.ts#L10).
    2.  O texto limpo gerado é processado por um tokenizador que calcula a métrica exata de custo em tokens antes de enviar para processamentos de IA no [text-processor.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/services/infrastructure/text-processor.ts#L20).

*   **Exemplo de Uso pelo Cliente:**
    O sistema realiza essa orquestração silenciosamente em segundo plano sempre que o aluno insere o link de um artigo ou lei online em seus materiais. O link é raspado e integrado instantaneamente na base vetorial.

*   **Referências de Código:**
    *   Camada de Orquestração: [index.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/services/infrastructure/index.ts)
    *   Micro-Serviço Web Scraper (Firecrawl v4): [web-scraper.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/services/infrastructure/web-scraper.ts)
    *   Micro-Serviço Tokenizer: [text-processor.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/services/infrastructure/text-processor.ts)
    *   Action de Ingestão Atômica: [ingestWebMaterialAction](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/materials.ts)

---

## 10. Módulo: Configurações & Personalização (Persona AI)

Módulo central de gestão de perfil e preferências de interface, permitindo que o aluno calibre o comportamento do sistema e da IA.

*   **O que faz por baixo dos panos:**
    1.  Gerencia a tabela satélite `user_settings` vinculada ao usuário via Drizzle.
    2.  **Calibragem de Persona:** Permite selecionar perfis (Concurseiro, Universitário, etc.), o que altera dinamicamente o *System Prompt* e a prioridade de busca do Garimpo.
    3.  **Acessibilidade Visual:** Injeta atributos de dados (`data-font-size`) e temas (via `next-themes`) para feedback visual imediato (0ms) sem recarregar a página.
    4.  **Gestão de Notificações:** Controla os gatilhos de alertas para revisões SM-2 e radar de novos editais.

*   **Exemplo de Uso pelo Cliente:**
    O aluno acessa a aba "Perfil & Persona" e altera seu nível para "Concurseiro". Imediatamente, o Chat do PLANY passa a adotar um tom mais focado em legislação e jurisprudência, e o tamanho da fonte de todo o sistema aumenta para 18px (XL) conforme sua preferência de leitura.

*   **Referências de Código:**
    *   Server Actions de Configurações: [settings.ts](file:///c:/Users/kyper/Desktop/Projects/plany/lib/actions/settings.ts)
    *   Interface de Usuário: [settings-form.tsx](file:///c:/Users/kyper/Desktop/Projects/plany/app/dashboard/settings/components/settings-form.tsx)
    *   Esquema de Dados: [userSettings](file:///c:/Users/kyper/Desktop/Projects/plany/lib/db/schema.ts)

---
*Este mapa operacional foi estruturado em 17 de Maio de 2026 para documentar detalhadamente todas as pontas do ecossistema de funcionalidades do PLANY.*
