# PLANY - CLAUDE DEVELOPER GUIDELINES

## 🚨 REGRA SUPREMA: Testes Primeiro & Cobertura Total (TDD Obrigatório)
**ESTA É A DIRETRIZ MESTRA DESTE PROJETO:** Antes de escrever qualquer código de produção para novas funcionalidades, modificações ou refatorações, **você deve obrigatoriamente criar os testes automatizados correspondentes (TDD)**.
- **TDD:** Escreva os testes unitários/integração (`vitest`) antes do código de produção.
- **Obrigatoriedade:** Sem testes prévios = sem implementação.
- **Validação:** Rode `npm run test` e garanta sucesso completo antes do build.

---

## 🛠️ Comandos Rápidos do Projeto
*   **Iniciar Servidor Dev:** `npm run dev`
*   **Rodar Testes (Vitest):** `npm run test` (ou `npm run test:watch` para watch mode)
*   **Verificar Cobertura:** `npm run test:coverage`
*   **Compilar Produção (Build Check):** `npx vercel build` (ou `npm run build`)
*   **Formatar Código:** `npm run format`
*   **Executar Linting:** `npm run lint`
*   **Verificar Tipagem:** `npm run type-check`
*   **Drizzle Kits Sync:** `npx drizzle-kit push`

---

## 🎨 Lógica de Arquitetura & UX
1. **Local-First & Optimistic Updates (0ms):** A interface deve responder na hora para qualquer ação de escrita (`Create`, `Update`, `Delete`), atualizando o Zustand/cache local antes mesmo de disparar a mutation de background no servidor.
2. **Preservação Extrema de Tokens:** Processamos e fatiamos PDFs para Markdown estruturado antes de passar pela IA, utilizando Semantic Caching (similaridade > 0.95 no banco ativa o cache imediato com custo zero de token).
3. **Services & Server Actions Layer:** Não use queries diretas do Drizzle em componentes do React. Toda lógica de banco de dados reside em `lib/actions/` organizada por domínio de serviços, retornando `ActionResponse<T>`.

Consulte sempre os arquivos centrais de conhecimento:
*   [rules.md](file:///c:/Users/kyper/Desktop/Projects/plany/.gemini/rules.md)
*   [AGENTS.md](file:///c:/Users/kyper/Desktop/Projects/plany/AGENTS.md)
*   [funcionalidades.md](file:///c:/Users/kyper/Desktop/Projects/plany/.gemini/funcionalidades.md)
