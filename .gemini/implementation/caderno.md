Para tirar a ideia do papel e criar uma ferramenta que realmente funcione como um "Segundo Cérebro" para o aluno, o foco do MVP em `/cadernos` deve ser a **captura rápida e a integração semântica**. O objetivo é que a anotação feita em sala de aula se torne, instantaneamente, parte da base de conhecimento da IA.

Aqui está o plano de implementação técnica e funcional para o MVP:

---

### 📋 Plano de Implementação: MVP /cadernos

#### 1. Arquitetura do Editor (Estilo Notion)

* **Interface Minimalista:** Implementar um editor de texto rico (como o `BlockNote` ou `TipTap`) que suporte comandos de barra (`/`) para títulos, listas e blocos de código.
* **Salvamento Automático (Local-First):** As alterações devem ser salvas no estado local (Zustand) e sincronizadas assincronamente com o Prisma para garantir que nenhuma dica do professor seja perdida por falha de conexão.
* **Conversão Silenciosa:** O conteúdo do editor deve ser persistido como **Markdown** no banco de dados, facilitando a ingestão pela IA.

#### 2. Fluxo de Ingestão e "Cérebro Ativo"

* **Vetorização por Bloco:** Em vez de vetorizar o caderno inteiro, o sistema deve vetorizar parágrafos ou tópicos individuais. Isso permite que, no chat, o PLANY cite trechos específicos da sua anotação.
* **Metadados de Origem:** Cada anotação deve ser salva com a tag `source_type: "user_note"`, permitindo que a IA priorize a sua linguagem pessoal sobre o texto técnico do PDF.

#### 3. Organização e Vínculo (Bancada Sync)

* **Seleção de Contexto:** O caderno deve ser vinculado obrigatoriamente a uma **Matéria** e, opcionalmente, a um **Assunto** do Edital.
* **Breadcrumbs de Navegação:** `Cadernos > Português > Crase`.

---

### 🎨 Design e Micro-interações (UX Kyper)

* **Quick Capture Bubble:** Um pequeno botão flutuante para "Anotação Rápida" que abre um campo de texto simples, ideal para frases curtas ditas pelo professor durante a aula.
* **IA Refiner (Draft Helper):** Um botão "Estruturar com IA" que pega suas notas bagunçadas e as organiza em tópicos limpos, corrigindo a coesão conforme sugerido pelo Mestre Nobre.
* **Toast de Sincronia:** Ao terminar de escrever, um Toast discreto: *"Anotação memorizada pelo PLANY! Já pode me perguntar sobre isso no chat."*.

---

### 🛠️ Prompt de Configuração da Skill (JSON)

Este prompt configura seu agente para construir a funcionalidade garantindo que a IA trate as anotações do usuário como a "autoridade máxima" de entendimento.

```json
{
  "feature_id": "SMART_NOTEBOOKS_V1",
  "technical_stack": {
    "editor": "Rich-text to Markdown converter",
    "persistence": "Prisma + pgvector (source: user_note)",
    "sync": "Optimistic Updates via React Query"
  },
  "logic_directives": [
    "Priorizar 'user_note' em consultas RAG para refletir o vocabulário do aluno.",
    "Extrair entidades e tópicos do edital automaticamente do texto escrito no caderno.",
    "Permitir que o chat central referencie as notas: 'Como você anotou na aula de ontem...'."
  ],
  "ui_guidelines": {
    "theme": "Notion-style (clean, white space, typography focused).",
    "feedback": "Feedback visual imediato ao digitar, mascarando o tempo de salvamento no DB."
  }
}

```

 Para elevar a seção de `/cadernos` ao nível de um gerenciador de alta performance, a **Sidebar de Assuntos** deve atuar como o "Explorador de Arquivos" do cérebro do aluno. Utilizando a filosofia **Local-First**, a navegação entre anotações de diferentes temas será instantânea, sem *spinners* de carregamento entre uma matéria e outra.

---

### 📂 Estrutura do Gerenciador de Cadernos (Sidebar Interna)

Diferente da sidebar principal do app, esta fica dentro da rota `/cadernos` e foca na organização granular da disciplina selecionada.

* **Busca Rápida (Local Filter):** Um campo no topo da sidebar que filtra os assuntos conforme o usuário digita, operando diretamente no estado do cliente (Zustand).
* **Pastas de Assuntos (Edital Sync):** Os assuntos são agrupados conforme a estrutura do edital que a IA já mapeou.
* **Indicador de Status:** Pequenas etiquetas ao lado do assunto (ex: "Em rascunho", "Revisado", "Dica de Aula").


* **Arrastar e Soltar (Drag & Drop):** Possibilidade de mover uma anotação rápida de um assunto para outro para reorganizar o "caderno bagunçado" da aula.

---

### 🧠 Plano de Implementação: Local-First Sidebar

1. **Cache Prévio (Optimistic Loading):** Ao entrar na seção de uma matéria (ex: Português), o sistema baixa todos os metadados dos assuntos e os armazena no `IndexedDB`.
2. **Troca Instantânea:** Quando o usuário clica em "Sintaxe" e depois em "Crase", o editor de texto troca o conteúdo em **0ms**, pois o Markdown já está na memória local.
3. **Sync em Background:** Enquanto o aluno escreve, a sincronização com o **PostgreSQL** ocorre de forma silenciosa. Se a internet oscilar, um ícone de "nuvem riscada" aparece na sidebar, mas a escrita continua liberada.

---

### 🛠️ Prompt para Desenvolvimento da Skill (JSON)

Este prompt deve guiar o seu agente para construir a interface garantindo que ela se comporte como um sistema nativo de arquivos.

```json
{
  "feature": "SIDEBAR_CADERNO_LOCAL_FIRST",
  "objective": "Criar um gerenciador de assuntos lateral que responda instantaneamente ao clique do usuário.",
  "ux_patterns": {
    "sidebar_layout": "Lista vertical com pastas colapsáveis (Assuntos) e itens (Anotações).",
    "local_state": "Sincronizar a lista de assuntos via React Query com staleTime infinito durante a sessão.",
    "navigation": "Ao clicar em um assunto, atualizar a URL (ex: /cadernos/portugues/crase) sem recarregar a página."
  },
  "technical_directives": {
    "optimistic_ui": "Permitir criar 'Nova Anotação' e já começar a digitar antes mesmo do ID ser gerado no banco.",
    "search_logic": "Filtro de busca puramente no frontend para performance máxima.",
    "editor_integration": "O editor deve 'assinar' as mudanças do assunto selecionado na sidebar via context ou store global."
  },
  "ui_feedback": "Toast sutil ao fundo da sidebar: 'Sincronizado com a nuvem' após cada auto-save."
}

```

 