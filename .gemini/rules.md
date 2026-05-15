# Diretrizes Globais do Projeto PLANY

Este arquivo consolida todas as regras, padrões arquiteturais, de UX e de código que regem o desenvolvimento do **PLANY**. Como uma aplicação de alta performance voltada para estudos, a eficiência (redução de tokens/latência) e a experiência do usuário (UX fluida) são as maiores prioridades.

---

## 1. Arquitetura Local-First & Performance (0ms)
A aplicação deve parecer um software nativo, respondendo instantaneamente às interações do usuário.

- **Estado Local e Sincronização:** Utilize **Zustand** para o estado global da interface e **TanStack Query** para a ponte de dados assíncrona.
- **Optimistic Updates:** A interface **DEVE** reagir imediatamente à ação do usuário (ex: marcar tópico como concluído) antes da confirmação do servidor. Se houver falha, realize um *Silent Rollback* e avise via Toast.
- **Processamento em Background:** Tarefas pesadas da IA (conversão de PDF para MD, vetorização) nunca devem bloquear a UI. Use indicadores sutis (como badges de "Sincronizando") na barra lateral enquanto o backend trabalha.
- **Skeletons:** Use Skeleton screens para disfarçar latência ao invés de spinners de tela cheia.

---

## 2. Preservação Extrema de Tokens e IA
O projeto utiliza um pipeline avançado para reduzir custos da API do Gemini em até 99%.

- **Conversão Obrigatória (PDF -> MD):** Nunca envie PDFs ou textos brutos densos para a IA. Todo material passa pelo `@pdfme/converter` ou ferramenta similar no servidor e vira Markdown estruturado.
- **RAG Cirúrgico (pgvector):** 
  - Todo Markdown é fatiado via `chunkMarkdown` em pedaços de ~1000 caracteres.
  - Vetorize com `text-embedding-004`.
  - Nas rotas de Chat, busque apenas os **Top 5 chunks** mais similares e injete no *System Prompt* (Drizzle + pgvector).
- **Semantic Caching:** 
  - Antes de gerar uma nova resposta no chat, verifique a tabela `semantic_cache`.
  - Se a similaridade da pergunta atual com uma anterior for **> 0.95**, retorne a resposta salva em banco (Custo 0 tokens).
- **Extração Estruturada:** Ao extrair dados de editais, use `Gemini 2.5 Flash` com esquemas Zod exigindo saídas estritas em JSON.

---

## 3. Qualidade de Código (Backend & Frontend)

- **Service Layer para IA:** A lógica de invocação do SDK (`@google/genai`) e a montagem de prompts longos não devem sujar as rotas (`app/api/chat/route.ts` deve apenas orquestrar). Idealmente, extraia para `lib/ai-optimizations.ts` ou arquivos em `services/`.
- **Validação:** Retornos em JSON da IA devem ser validados antes de serem salvos no banco.
- **Imutabilidade de Vetores:** Evite deletar vetores (`material_chunks`) levianamente se eles ainda forem úteis para o histórico de conhecimento.
- **Tipagem Forte:** Explore ao máximo o TypeScript nos schemas do Drizzle (`lib/db/schema.ts`).

---

## 4. Micro-Interações e UX de Elite
A interface deve celebrar o progresso e reduzir a ansiedade do estudante.

- **Toasts (Sonner):** Mensagens despojadas e úteis. Substitua "Salvo com sucesso" por *"Lido e memorizado! Identifiquei 4 tópicos. Vamos começar?"*. Use dicas de descanso para estudos contínuos.
- **Indicadores de IA:** Use disparos de brilho (*glow*) na UI quando a IA termina de vetorizar um conteúdo. Use Badges (ex: um relâmpago) no chat para indicar quando a resposta foi obtida do *Cache Semântico* (0ms).
- **Transições Suaves:** Accordions e navegação hierárquica na Sidebar devem ter expansões suaves. Exiba botões de ação (editar/excluir) apenas no estado de `:hover` para não poluir a interface.

---

## 5. UI Components & Shadcn Rules
O projeto utiliza `shadcn/ui`. O respeito às suas convenções de estilo e estruturais é obrigatório.

### Estrutura e Tailwind
- **Classes de Layout:** Use `className` (ex: `max-w-md mx-auto`) apenas para layout e posicionamento.
- **Espaçamento:** Nunca use `space-y-*` ou `space-x-*`. Utilize SEMPRE `flex` com `gap-*` (ex: `flex flex-col gap-4`).
- **Dimensões Iguais:** Use `size-*` no lugar de `w-* h-*` quando as dimensões forem idênticas.
- **Omissões de Classes CSS:** Prefira a classe `truncate` em vez de escrever `overflow-hidden text-ellipsis whitespace-nowrap`.
- **Z-Index:** Componentes como Dialog, Sheet, e Popover cuidam de sua própria pilha. **NÃO USE** `z-50` manualmente.
- **Condicionais:** Use a função utilitária `cn()` para mesclar ou aplicar classes condicionalmente.

### Cores e Temas
- **Cores Semânticas:** Nunca use valores crus (ex: `bg-blue-500`, `text-red-600`). Use sempre tokens semânticos: `bg-primary`, `text-muted-foreground`, `text-destructive`, `bg-background`.
- **Dark Mode:** O tema gerencia automaticamente o modo escuro via variáveis CSS (`globals.css`). Nunca adicione as classes de sobreposição manual `dark:` (ex: `dark:bg-gray-900`).
- **Estados/Status:** Em vez de textos coloridos crus, use o componente `<Badge>` com suas variantes (`secondary`, `destructive`, etc.).

### Composição de Componentes (Composition)
- **Forms:** Utilize a nova arquitetura `FieldGroup` e `Field`. Componentes devem ditar a validação (`data-invalid`/`aria-invalid`).
- **Ícones:** 
  - Respeite o pacote de ícones configurado (verificar se é Lucide, Hugeicons, Tabler).
  - Em botões, passe a prop `data-icon="inline-start"` ou `data-icon="inline-end"`.
  - **NUNCA** aplique classes de dimensionamento (`size-4`) diretamente no componente do ícone; a biblioteca UI ajusta o tamanho nativamente.
- **Componentes de Grupo:** Itens devem sempre estar envoltos em seus grupos (ex: `SelectItem` dentro de `SelectGroup`).
- **Cards e Dialogs:** Utilize a composição completa (`CardHeader`, `CardTitle`, `CardContent`). `Dialog` sempre exige `DialogTitle` (visível ou com `sr-only`).
- **Loading:** Em botões, evite props inventadas como `isLoading`; use um componente `<Spinner>` junto a `disabled`. Para esqueletos de interface, use o componente `<Skeleton>`.

---

## Resumo Operacional para o Agente IA
1. Ao criar uma nova tela, pesquise na UI existente antes de criar marcação customizada.
2. Toda ação de escrita no backend deve pensar em "Como isso afeta o usuário na tela de forma otimista?".
3. O Chatbot usa RAG: não alimente a rota com texto cru de banco, busque os vetores.
4. Garanta a correta importação de ícones de acordo com a biblioteca padrão atual (`@hugeicons/react` ou `lucide-react` confome o projeto indica).
5. Escreva testes unitários para lógicas vitais de dados e processamento de IA.