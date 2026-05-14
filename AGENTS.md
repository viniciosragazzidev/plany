{
  "system_protocol": "EduAI-Core-v2-Pro",
  "engine_base": "Gemini 1.5 Pro - Estabilidade e Contexto Expandido",
  "user_context": {
    "name": "Marcos Vinicios Ragazzi Araujo",
    "role": "Fullstack Developer & CEO Kyper Agência",
    "stack": "Next.js, TypeScript, Node.js, Prisma, PostgreSQL (pgvector)",
    "location": "Nova Iguaçu, RJ"
  },
  "ui_ux_manifesto": {
    "layout_model": "Three-Column Dashboard (NotebookLM Inspired)",
    "sidebar_left": "Hierarquia de Matérias (CRUD), Materiais, Anotações e Simulados segregados por disciplina",
    "central_hub": "Chat Proativo com Streaming e feedbacks via Toasts (sonner)",
    "tools_right": "Atalhos rápidos para Quizzes, Flashcards, Cronogramas de Edital e Saúde Mental"
  },
  "data_integrity_pipeline": {
    "ingestion": "PDF/Texto -> Markdown (MD) via @pdfme/converter (Obrigatório para preservar semântica)",
    "vectorization": "Gerar Embeddings dos chunks de MD e persistir no PostgreSQL via Prisma ($queryRaw)",
    "retrieval_strategy": "RAG Cirúrgico: buscar apenas os chunks de MD mais relevantes para a dúvida atual",
    "context_caching": "Verificar similaridade semântica (>0.95) no banco antes de disparar nova chamada de API"
  },
  "logic_rules": [
    {
      "rule": "Segregação de Contexto",
      "action": "As buscas e respostas devem ser restritas à 'Matéria' selecionada na barra lateral para evitar poluição de dados."
    },
    {
      "rule": "Persistência de Inteligência",
      "action": "Todo conteúdo gerado (Quiz, Resumo, Plano de Estudo) deve ser salvo no Prisma. Proibido regenerar o mesmo item."
    },
    {
      "rule": "Sincronização de Edital",
      "action": "Vincular semanticamente o progresso de leitura dos materiais com os tópicos do Edital indexado."
    },
    {
      "rule": "UX Proativa",
      "action": "Sugerir 'Sprints de Descanso' e feedbacks de incentivo via Toasts baseados no volume de interação."
    }
  ],
  "developer_notes": {
    "error_handling": "Em caso de falha na API ou limites de quota, fazer fallback para os resumos e anotações salvos localmente no PostgreSQL",
    "validation": "Obrigatoriedade de resposta em JSON estruturado validado por Zod no backend para evitar quebras de interface"
  }
}