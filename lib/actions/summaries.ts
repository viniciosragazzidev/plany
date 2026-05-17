'use server'

import { db } from "@/lib/db";
import { 
  summaries, 
  materials, 
  subjects
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { generateAIContent } from "@/lib/ai-service";
import { createHash } from "crypto";

function generateMaterialsHash(ids: string[]): string {
  return createHash("sha256").update(ids.sort().join(",")).digest("hex");
}

export async function getSummariesAction(benchId: string, subjectId?: string) {
  try {
    const conditions = [eq(summaries.benchId, benchId)];
    if (subjectId) {
      conditions.push(eq(summaries.subjectId, subjectId));
    }

    const list = await db
      .select()
      .from(summaries)
      .where(and(...conditions))
      .orderBy(desc(summaries.createdAt));

    return { success: true, summaries: list };
  } catch (error: any) {
    console.error("Erro ao buscar resumos:", error);
    return { success: false, error: error.message };
  }
}

export async function generateSummaryAction(
  benchId: string, 
  subjectId: string, 
  materialIds: string[]
) {
  try {
    if (materialIds.length === 0) {
      throw new Error("Selecione pelo menos um material para resumir.");
    }

    const materialsHash = generateMaterialsHash(materialIds);

    // 1. Check for existing summary with same hash
    const existing = await db.query.summaries.findFirst({
      where: and(
        eq(summaries.subjectId, subjectId),
        eq(summaries.materialsHash, materialsHash)
      )
    });

    if (existing) {
      return { 
        success: true, 
        summary: existing, 
        message: "Opa! Já preparei esse mapa de guerra pra você. Carregando a version existente..." 
      };
    }

    // 2. Retrieval: Get context from selected materials
    const selectedMaterials = await db.query.materials.findMany({
      where: inArray(materials.id, materialIds)
    });

    const contextText = selectedMaterials
      .map(m => `--- MATERIAL: ${m.title} ---\n${m.content || ""}`)
      .join("\n\n");

    if (!contextText.trim()) {
      throw new Error("Os materiais selecionados não possuem conteúdo textual para resumir.");
    }

    const subject = await db.query.subjects.findFirst({
      where: eq(subjects.id, subjectId)
    });

    // 3. AI Generation
    const systemPrompt = `Você é um Tutor Pedagógico da Kyper Agência, especialista em simplificação de conteúdos complexos.
    Sua missão é criar um Resumo Estruturado 2.0 que seja o "Tradutor de Leigos" definitivo.

    DIRETRIZES PEDAGÓGICAS:
    - Estilo: Linguagem para leigos, coesa e coerente.
    - Objetivo: Explicar apenas o que o edital de concurso pede, sem excessos ou academicismo.
    - Tom: Tutor amigável, despojado e motivador.
    - Analogias: Uso OBRIGATÓRIO de analogias do cotidiano para conceitos complexos.

    ESTRUTURA JSON EXIGIDA:
    {
      "title": "Resumo: ${subject?.title || 'Conceitos Chave'}",
      "timeline": [
        {
          "step": "Título do Tópico",
          "content": "Explicação simplificada e direta.",
          "analogy": "Analogia do cotidiano para fixar este tópico específico.",
          "masterTip": "Dica rápida de mestre para não cair em pegadinha."
        }
      ],
      "conclusion": "Mensagem final motivadora e breve."
    }

    Retorne APENAS o JSON válido.`;

    const response = await generateAIContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: `CONTEÚDO BASE PARA O RESUMO:\n${contextText.substring(0, 40000)}` }] }],
      config: {
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        responseMimeType: "application/json"
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("A IA não conseguiu gerar o resumo.");
    
    const summaryData = JSON.parse(responseText);

    // 4. Save to Database
    const [newSummary] = await db.insert(summaries).values({
      benchId,
      subjectId,
      title: summaryData.title,
      content: responseText,
      materialsHash,
    }).returning();

    revalidatePath(`/dashboard/bancadas/${benchId}`);
    return { success: true, summary: newSummary };

  } catch (error: any) {
    console.error("Erro ao gerar resumo:", error);
    return { success: false, error: error.message };
  }
}

export async function exportSummaryToNotebookAction(
  benchId: string,
  subjectId: string,
  summaryTitle: string,
  summaryJson: string
) {
  try {
    const data = JSON.parse(summaryJson);
    
    // Format to Markdown for the notebook
    let markdown = `# ${data.title}\n\n`;
    
    data.timeline.forEach((item: any) => {
      markdown += `## ${item.step}\n\n`;
      markdown += `${item.content}\n\n`;
      markdown += `💡 **Analogia:** ${item.analogy}\n\n`;
      markdown += `🚀 **Dica do Mestre:** ${item.masterTip}\n\n`;
      markdown += `---\n\n`;
    });
    
    markdown += `*${data.conclusion}*`;

    // Create a new material of type 'anotacao'
    const [newNote] = await db.insert(materials).values({
      benchId,
      subjectId,
      title: `[Resumo] ${summaryTitle}`,
      type: 'anotacao',
      content: markdown,
    }).returning();

    revalidatePath(`/dashboard/cadernos`);
    revalidatePath(`/dashboard/bancadas/${benchId}`);
    
    return { success: true, noteId: newNote.id };
  } catch (error: any) {
    console.error("Erro ao exportar resumo:", error);
    return { success: false, error: error.message };
  }
}
