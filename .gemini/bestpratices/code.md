Como você é um desenvolvedor **Fullstack** trabalhando com uma stack robusta (**Next.js, TypeScript, Prisma, PostgreSQL**), o foco aqui é manter o código escalável para que a IA não se torne um "emaranhado" técnico difícil de manter.

Aqui estão as boas práticas de código focadas em performance e sustentabilidade para o seu ecossistema de estudos:

---

## 1. Arquitetura e Organização de Código

* **Service Layer para IA:** Nunca chame a API do Gemini diretamente nos seus componentes ou rotas de API. Crie uma camada de serviço (`services/aiService.ts`) que abstrai a lógica de integração, tratamento de erros e formatação de prompts.


* **Prompt Management:** Não "hardcode" prompts longos dentro das funções. Organize-os em arquivos de configuração ou pastas específicas (`prompts/study-tutor.ts`) para facilitar o ajuste fino (fine-tuning) sem poluir a lógica de negócio.


* **Schemas de Validação com Zod:** Como você usa TypeScript, utilize o **Zod** para validar o retorno da IA. Se você pediu um JSON de quiz, garanta que ele segue o formato antes de salvar no banco ou renderizar na tela.



---

## 2. Otimização de Performance (Backend)

* **Streaming de Respostas:** Para o chat central, utilize o suporte de streaming da API do Gemini e do Vercel AI SDK. Isso permite que o texto apareça gradualmente para o aluno, eliminando a percepção de latência.


* **Background Processing (Queue):** O processo de "PDF -> MD -> Embeddings" pode ser pesado. Use uma fila (como BullMQ ou os Background Jobs do próprio Supabase) para processar a indexação fora do ciclo de requisição principal, disparando um **Toast** de conclusão via WebSocket ou Server-Sent Events.


* **Database Indexing:** No Prisma, certifique-se de que o campo `subjectId` e as chaves estrangeiras dos materiais tenham índices adequados para que a navegação na barra lateral seja instantânea, mesmo com milhares de arquivos.



---

## 3. Sustentabilidade e Tipagem (Frontend)

* **Componentização "Atomic":** Mantenha a separação clara entre os componentes da barra lateral (SubjectList, MaterialItem) e o ChatWindow. Isso facilita a manutenção da UI inspirada no NotebookLM.


* **Custom Hooks para Lógica de Estudo:** Crie hooks como `useStudySession` ou `useQuizGenerator` para encapsular o estado da gamificação e dos simulados, mantendo os componentes de visualização limpos.


* **Immutabilidade nos Vetores:** Ao atualizar o "Cérebro de Contexto" de uma matéria, prefira versionar ou marcar os vetores antigos como inativos em vez de deletá-los imediatamente, permitindo "rollbacks" de conhecimento se necessário.



---

## 4. Gestão de Erros e Logs

* **Fallback Gracioso:** Se a IA falhar ou atingir o limite de tokens, o sistema deve ser capaz de buscar a última anotação salva no Prisma para não deixar o aluno "na mão".


* **Observabilidade de Tokens:** Implemente um log simples que registre quantos tokens cada usuário/matéria está consumindo. Isso ajudará você a identificar quais materiais são mais "caros" de processar e otimizar seus chunks.



```typescript
// Exemplo de estrutura de Service Layer
export const AIService = {
  async generateQuiz(subjectId: string, materialId: string) {
    // 1. Busca chunks relevantes no pgvector via Prisma[cite: 1]
    // 2. Monta o prompt contextualizado[cite: 1]
    // 3. Chama o Gemini 1.5 Flash (custo-benefício)[cite: 1]
    // 4. Valida com Zod e salva no banco antes de retornar[cite: 1]
  }
}

```

Essas práticas garantem que sua agência, **Kyper**, entregue um produto de nível empresarial, com código limpo e pronto para escala.

Qual dessas camadas você gostaria de aprofundar na implementação agora?