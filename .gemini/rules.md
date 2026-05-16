# Diretrizes Globais do Projeto PLANY

Este arquivo consolida todas as regras, padrões arquiteturais, de UX e de código que regem o desenvolvimento do **PLANY**. Como uma aplicação de alta performance voltada para estudos, a eficiência (redução de tokens/latência) e a experiência do usuário (UX fluida) são as maiores prioridades.

---

## 1. Arquitetura Local-First & Performance (0ms)
**REGRA DE OURO:** A interface deve reagir instantaneamente (0ms) a qualquer ação de escrita do usuário. O PLANY não é um site, é um software nativo no navegador.

- **Mandato de Feedback Instantâneo:** Nunca exiba spinners de tela cheia ou bloqueie a UI enquanto espera o servidor para Mutações (Create, Update, Delete).
- **Padrão de Optimistic Updates (Zustand/TanStack):**
    - **Ação:** Atualize o estado local (Zustand) ou o cache (Query) IMEDIATAMENTE.
    - **Criação:** Use IDs temporários (`temp_...`) para exibir o novo item na hora. Substitua pelo ID real no sucesso da Promise em background.
    - **Exclusão:** Remova o item da lista e navegue para fora da tela de detalhe (se necessário) instantaneamente.
- **Sincronização Assíncrona e Resiliência:** 
    - Toda persistência no banco deve ser tratada como um processo de segundo plano.
    - **Silent Rollback:** Em caso de erro de rede ou servidor, restaure o estado anterior localmente de forma silenciosa e notifique o usuário via Toast despojado.
- **Processamento em Background (Non-Blocking AI):** Tarefas pesadas (Vetorização, OCR) devem usar indicadores sutis (badges, glows) e nunca impedir que o usuário continue estudando outras partes do app.
- **Lógica de Skeletons:** Use Skeletons apenas para o carregamento inicial de dados (Read), nunca para ações de escrita (Write).

---

## 2. Preservação Extrema de Tokens e IA
O projeto utiliza um pipeline avançado para reduzir custos da API do Gemini em até 99%.

- **Conversão Obrigatória (PDF -> MD):** Nunca envie PDFs ou textos brutos densos para a IA. Todo material passa pelo `@pdfme/converter` ou ferramenta similar no servidor e vira Markdown estruturado.
- **DNA de Conteúdo (Hashing):** Antes de processar ou vetorizar textos, compare o `content_hash` (SHA-256). Se o conteúdo semântico não mudou, o custo deve ser zero.
- **Resiliência Multi-Modelo:** Para funções críticas (OCR/Chat), implemente fallback automático (ex: Gemini 2.5 Flash) e retentativas com *exponential backoff* para contornar erros 429 de quota.
- **RAG Cirúrgico (pgvector):** 
  - Todo Markdown é fatiado via `chunkMarkdown` em pedaços de ~1000 caracteres.
  - Vetorize com `text-embedding-004`.
  - Nas rotas de Chat, busque apenas os **Top 5 chunks** mais similares e injete no *System Prompt* (Drizzle + pgvector).
- **Semantic Caching:** 
  - Antes de gerar uma nova resposta no chat, verifique a tabela `semantic_cache`.
  - Se a similaridade da pergunta atual com uma anterior for **> 0.95**, retorne a resposta salva em banco (Custo 0 tokens).
- **Extração Estruturada:** Ao extrair dados de editais, use `Gemini 2.5 Flash` com esquemas Zod exigindo saídas estritas em JSON.
- **Tiptap Markdown Handling:** Sempre que inserir Markdown vindo de IA ou Paste no editor, utilize obrigatoriamente o `editor.markdown.parse(content)` oficial. Isso garante que o motor interno converta os nós corretamente e evita erros de `RangeError` ou perda de formatação visual.

## Fluxo de Verificação Obrigatória

Para garantir a estabilidade e o padrão de excelência, **toda nova implementação ou correção** deve obrigatoriamente seguir este fluxo antes de ser considerada concluída:

1.  **Linting:** Execute `npm run lint` e resolva todos os erros de lógica e avisos críticos. Não ignore erros de `any` ou `hooks` sem justificativa extrema.
2.  **Testes Unitários:** 
    *   Verifique se a lógica vital (extrações de IA, cálculos de progresso, ações de banco) possui cobertura em `vitest`.
    *   Se for uma nova funcionalidade de lógica, crie um arquivo `.test.ts` correspondente.
    *   Execute `npm test` para garantir que nada foi quebrado.
3.  **Build Check:** Sempre valide se as mudanças não introduziram erros de tipagem que quebram o build da Vercel (TypeScript).

Siga rigorosamente estas etapas para manter o PLANY no estado da arte.

---

## 3. Qualidade de Código & Actions Padronizadas (Services Layer)
O PLANY utiliza uma camada de serviço centralizada para desacoplar a UI da lógica de banco de dados e garantir consistência em todo o ecossistema.

- **Centralização de Ações:** Nunca realize queries diretas (Drizzle) dentro de componentes. Toda lógica de dados deve residir em `lib/actions/` organizada por domínio (ex: `user-actions.ts`, `study-actions.ts`).
- **Padrão de Resposta (ActionResponse):** Todas as Server Actions **DEVEM** seguir a interface padronizada:
  ```typescript
  type ActionResponse<T> = 
    | { success: true; data: T; message: string }
    | { success: false; data: null; message: string; error: string };
  ```
  - Utilize sempre os utilitários `actionSuccess(data, msg)` e `actionError(msg)`.
- **Validação e Segurança:**
  - **Zod:** Valide rigorosamente todos os inputs e outputs de ações usando Zod schemas.
  - **Auth:** Verifique sempre a sessão (`auth.api.getSession`) e a propriedade do dado (`userId`) antes de qualquer consulta ou mutação.
- **Sincronização & Revalidação:**
  - Toda ação de escrita (mutação) deve disparar `revalidatePath` para as rotas afetadas. 
  - Sempre inclua revalidação para rotas globais como `/dashboard` quando alterar dados que impactam contadores ou métricas gerais.
- **Service Layer para IA:** A lógica de invocação do SDK (`@google/genai`) e a montagem de prompts não devem sujar as rotas. Extraia para `lib/ai-optimizations.ts` ou ações específicas.
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