# Plano de Preservação de Tokens e Otimização de RAG

Este plano descreve a arquitetura para reduzir drasticamente o consumo de tokens e melhorar a velocidade (latência) da IA no projeto PLANY.

## 1. Pipeline Markdown (MD)
**Objetivo:** Evitar o envio de PDFs inteiros (que são densos em tokens) para a IA.
- **Ferramenta:** `@pdfme/converter` (ou equivalente no backend) para extrair o texto de PDFs.
- **Processo:**
  1. O usuário faz o upload do PDF.
  2. O backend converte obrigatoriamente o PDF para Markdown, preservando a estrutura de tópicos (H1, H2, listas).
  3. O Markdown bruto NUNCA é enviado na íntegra no prompt de chat. Ele serve apenas de base para o fatiamento (chunking).

## 2. Indexação e Vetorização (pgvector)
**Objetivo:** Preparar o texto para a busca semântica, permitindo o RAG Cirúrgico.
- **Banco de Dados:** PostgreSQL com a extensão `pgvector` gerenciado via Drizzle ORM (Tabelas `material_chunks` e `semantic_cache` implementadas).
- **Modelo de Embedding:** `text-embedding-3-small` da OpenAI, pois é rápido, barato e excelente para buscas semânticas (1536 dimensões).
- **Processo de Chunking:**
  - Fatiar o Markdown gerado em "chunks" (pedaços) de aproximadamente 500 a 1000 tokens cada.
  - O chunking deve respeitar os cabeçalhos do Markdown para não cortar ideias pela metade.
  - Cada chunk é vetorizado e salvo na tabela `material_chunks` vinculado ao `materialId`.

## 3. RAG Cirúrgico (Geração Aumentada por Recuperação)
**Objetivo:** Alimentar o `Gemini 1.5 Pro` (ou Flash) apenas com o estritamente necessário.
- **Processo Atual:** O `app/api/chat/route.ts` injeta TODO o conteúdo do material. ISSO DEVE PARAR.
- **Novo Processo:**
  1. O usuário faz uma pergunta no chat da bancada.
  2. A pergunta é vetorizada usando `text-embedding-3-small`.
  3. Uma busca de similaridade (Cosine Distance via pgvector) é executada na tabela `material_chunks`.
  4. Recuperamos APENAS os Top 3 ou Top 5 chunks mais relevantes.
  5. Injetamos apenas esses chunks selecionados no System Prompt.
- **Resultado:** Redução de mais de 90% no uso de tokens por mensagem.

## 4. Cache Semântico
**Objetivo:** Respostas em 0ms (Local-first mindset) e 0 tokens para perguntas repetidas.
- **Tabela:** `semantic_cache`
- **Processo:**
  1. O usuário envia uma dúvida (Ex: "O que é Ato Administrativo?").
  2. Vetorizamos a dúvida.
  3. Buscamos no `semantic_cache` se há uma `query` com similaridade superior a 95%.
  4. **Se sim (Cache Hit):** Retornamos imediatamente a `response` guardada, sem chamar a API do Gemini.
  5. **Se não (Cache Miss):** Rodamos o RAG Cirúrgico, geramos a resposta e, em seguida, salvamos a nova (query, queryEmbedding, response) no `semantic_cache`.

## 5. Arquiteto de Edital (Extração Estruturada)
**Objetivo:** Transformar editais gigantes de concurso em estruturas de banco de dados (`editalItems`) usando IA com baixo custo.
- **Modelo Recomendado:** `Gemini 2.5 Flash` (pois é excelente em extração estruturada de JSON e mais barato).
- **Processo:**
  1. Converter o Edital PDF para Markdown.
  2. Quebrar o edital em partes (geralmente a seção de "Conteúdo Programático").
  3. Usar um prompt focado que exige a saída com o schema do `zod` (`category`, `topic`, `weight`).
  4. O resultado é inserido diretamente no banco (tabela `editalItems` e `subjects`). 
  5. O usuário então interage com a UI estruturada, não mais com o texto bruto do edital.