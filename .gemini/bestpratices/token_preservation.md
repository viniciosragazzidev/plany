{
  "estrategia": "Persistent Intelligence & Token Conservation",
  "pilares": [
    {
      "categoria": "Cache de Respostas (Semantic Caching)",
      "boas_praticas": [
        "Antes de enviar uma pergunta para o Gemini, verifique no pgvector se uma pergunta similar já foi feita para aquele material.",
        "Se a similaridade for > 0.95, retorne a resposta gravada no banco de dados em vez de chamar a API.",
        "Armazene o par 'Pergunta-Resposta' no banco de dados via Drizzle ORM vinculado ao ID do material."
      ]
    },
    {
      "categoria": "Processamento On-Demand (Lazy Generation)",
      "boas_praticas": [
        "Não gere resumos ou quizes automaticamente no upload; espere o usuário clicar no botão de 'Ação Rápida'.",
        "Uma vez gerado um quiz ou flashcard, salve-o permanentemente via Drizzle. Nunca gere o mesmo conteúdo duas vezes.",
        "Use o formato Markdown para armazenar esses conteúdos, facilitando a renderização no frontend sem reprocessamento."
      ]
    },
    {
      "categoria": "Otimização de Contexto (RAG Cirúrgico)",
      "boas_praticas": [
        "Nunca envie o PDF/MD inteiro no prompt. Envie apenas os 3 ou 5 chunks mais relevantes recuperados via busca semântica no pgvector.",
        "Implemente 'Resumos de Tópicos' fixos no banco. Quando o aluno perguntar algo geral, use o resumo salvo em vez de pedir para a IA ler tudo de novo.",
        "Utilize metadados de página para que a IA apenas aponte o local, e o frontend renderize o texto original salvo no banco."
      ]
    },
    {
      "categoria": "Engenharia de Prompt Econômica",
      "boas_praticas": [
        "Use modelos menores e mais baratos (Gemini 2.5 flash) para tarefas simples como classificação de matérias ou extração de tópicos.",
        "Reserve o modelo mais potente (Gemini 2.5 flash) apenas para explicações complexas ou geração de simulados finais.",
        "Force a saída em JSON estruturado para evitar que a IA gaste tokens com conversas desnecessárias ('Aqui está seu quiz:', etc)."
      ]
    }
  ],
  "infraestrutura_recomendada": {
    "camada_de_dados": "PostgreSQL com pgvector e Drizzle ORM para busca de similaridade e cache semântico.",
    "gerenciamento_de_estado": "Vercel AI SDK (hooks como useChat) no frontend para gerenciar o histórico e evitar chamadas redundantes."
  }
}