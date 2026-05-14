Este guia de **Micro-interações de Elite** foi estruturado para ser injetado como contexto de skill no seu projeto. O foco é transformar a frieza de um sistema de arquivos em um organismo vivo que reage ao progresso do estudante, utilizando a stack da **Kyper Agência** (React, Tailwind, Sonner) para garantir performance e elegância.

---

### 🧠 Guia de Micro-interações: Ecossistema PLANY

O objetivo dessas interações é reduzir a ansiedade do usuário, celebrar pequenas vitórias e manter o fluxo de estudo orgânico.

#### 1. Feedback de Ingestão e Processamento ("O Cérebro Trabalhando")

* **Skeleton Sync:** Ao subir um PDF, o painel central não deve ficar em branco. Use *skeleton screens* que simulam a estrutura do Markdown sendo montada em tempo real.


* **Vetorização Visual:** Pequenos disparos de brilho (glow) nos itens da barra lateral quando o processo de `pgvector` termina, indicando que aquele material agora está "vivo" no chat.


* **Toast de Contexto:** Ao finalizar o upload, um Toast do Sonner deve dizer: *"Lido e memorizado! Identifiquei 4 tópicos do Edital neste arquivo. Vamos começar por onde?"*.



#### 2. Navegação na Sidebar (Estrutura Hierárquica)

* **Hover Revelador:** Os botões de CRUD (editar/excluir) e o ícone de "+" para novos assuntos devem aparecer apenas no *hover* da matéria, mantendo o visual limpo (estilo NotebookLM).


* **Accordion Suave:** A transição ao abrir `Bancada > Matéria > Assunto` deve ser fluida (usando `framer-motion` ou transições CSS), dando a sensação de profundidade física.


* **Indicador de Cobertura:** Uma borda de progresso sutil (progress ring) ao redor do ícone da matéria que se preenche conforme o usuário marca tópicos do edital como concluídos.



#### 3. O Chat Inteligente (Interação Proativa)

* **Streaming de Resposta:** O texto da IA deve aparecer com efeito de *typewriter* suave, mas com um botão de "pular para o fim" caso o usuário queira ler tudo instantaneamente.


* **Links de Referência:** Ao citar um material, o link no chat deve brilhar sutilmente ao passar o mouse, e ao clicar, a Sidebar esquerda deve destacar automaticamente o arquivo correspondente.


* **Badge de Cache:** Sempre que uma resposta vier do seu sistema de cache semântico (sem gasto de tokens), exiba um pequeno ícone de "relâmpago" azul no canto da mensagem para indicar velocidade máxima.



#### 4. Gamificação e Saúde Mental (Interrupções Positivas)

* **Sprint Toast:** Após 25 minutos de interação constante, o PLANY dispara um brinde (toast animado): *"Você está em chamas! 🔥 Estudou 3 tópicos de Português sem parar. Que tal um sprint de 5 min de descanso?"*.


* **Confetti de Conclusão:** Ao marcar todos os assuntos de uma matéria como "Estudado", uma chuva discreta de confetes virtuais no painel central celebra a "Vitória sobre a Matéria".


* **Dica de Rodapé:** Um widget na coluna direita que muda sutilmente com frases motivacionais ou dicas de respiração baseadas na hora do dia (ex: mais relaxantes à noite, mais focadas de manhã).



---

### 🛠️ Prompt de Contexto para a Skill (JSON)

Copie e integre este JSON para que a IA saiba como se comportar visualmente:

```json
{
  "skill_context": "PLANY_UX_INTERACTIONS",
  "priority": "High",
  "guidelines": {
    "feedback_style": "Proativo, despojado e focado em micro-vitórias[cite: 1].",
    "toast_patterns": {
      "success": "Sempre use 'sonner' com mensagens personalizadas que evitem o padrão 'Sucesso ao salvar'[cite: 1].",
      "info": "Dê dicas de saúde mental e pausas para o café de forma aleatória e bem-humorada[cite: 1]."
    },
    "visual_cues": {
      "processing": "Mostre ao usuário que o Markdown está sendo 'digerido' e os vetores criados[cite: 1].",
      "memory_hit": "Destaque quando o sistema usa a memória interna (cache) para responder instantaneamente[cite: 1]."
    }
  }
}

```

Este guia garante que o **PLANY** não seja apenas funcional, mas uma experiência viciante de aprendizado que respeita o ritmo do estudante.