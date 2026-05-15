'use server'

import { db } from "@/lib/db";
import { materials, studyBenches, subjects, editalItems, materialChunks } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function getCadernosSidebarData() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) throw new Error("Não autorizado");

    // Fetch all benches for the user
    // Wait, profiles is linked to user.id, but studyBenches are linked to profile.
    // Let's get the profile first.
    const profile = await db.query.profiles.findFirst({
        where: (profiles, { eq }) => eq(profiles.userId, session.user.id)
    });

    if (!profile) return { success: true, benches: [] };

    const userBenches = await db.query.studyBenches.findMany({
        where: eq(studyBenches.profileId, profile.id),
        with: {
            subjects: true,
        }
    });

    const benchIds = userBenches.map(b => b.id);

    if (benchIds.length === 0) return { success: true, benches: [] };

    // Fetch all materials of type 'anotacao'
    const anotacoes = await db.query.materials.findMany({
        where: and(
            eq(materials.type, "anotacao"),
            inArray(materials.benchId, benchIds)
        ),
        orderBy: [desc(materials.createdAt)]
    });

    return { 
        success: true, 
        benches: userBenches, 
        anotacoes 
    };
  } catch (error: any) {
    console.error("Erro ao buscar dados do caderno:", error);
    return { success: false, error: error.message };
  }
}

export async function createAnotacao(benchId: string, subjectId: string, title: string) {
    try {
        const [material] = await db.insert(materials).values({
            benchId,
            subjectId,
            title: title || "Nova Anotação",
            type: "anotacao",
            content: "",
        }).returning();

        revalidatePath("/dashboard/cadernos");
        return { success: true, anotacao: material };
    } catch (error: any) {
        console.error("Erro ao criar anotação:", error);
        return { success: false, error: error.message };
    }
}

export async function updateAnotacaoContent(materialId: string, content: string, title?: string) {
    try {
        const dataToUpdate: any = { content };
        if (title) dataToUpdate.title = title;

        const [material] = await db.update(materials)
            .set(dataToUpdate)
            .where(eq(materials.id, materialId))
            .returning();

        // Extrair texto legível para vetorização (suporta HTML do Tiptap e Fallback)
        let plainText = "";
        try {
            if (content.trim().startsWith("[") || content.trim().startsWith("{")) {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    // Legado BlockNote
                    plainText = parsed.map((b: any) => {
                        if (b.content && Array.isArray(b.content)) {
                            return b.content.map((t: any) => t.text || "").join(" ");
                        }
                        return "";
                    }).filter(Boolean).join("\n\n");
                } else {
                    plainText = content.replace(/<[^>]*>/g, " ");
                }
            } else {
                // Tiptap HTML
                plainText = content.replace(/<[^>]*>/g, " ");
            }
        } catch (e) {
            plainText = content.replace(/<[^>]*>/g, " "); // Fallback
        }

        if (plainText.trim().length > 0) {
            // Deleta chunks antigos
            await db.delete(materialChunks).where(eq(materialChunks.materialId, materialId));
            
            // Fatiamento e Vetorização em background (não precisa bloquear a UI, mas aqui aguardamos por simplicidade do MVP)
            const { chunkMarkdown, getEmbedding } = await import("@/lib/ai-optimizations");
            const chunks = chunkMarkdown(plainText);
            
            for (const chunk of chunks) {
                try {
                    const embedding = await getEmbedding(chunk);
                    await db.insert(materialChunks).values({
                        materialId,
                        content: chunk,
                        embedding
                    });
                } catch (err) {
                    console.error("Erro ao vetorizar anotação:", err);
                }
            }
        }

        revalidatePath("/dashboard/cadernos");
        return { success: true, anotacao: material };
    } catch (error: any) {
        console.error("Erro ao atualizar anotação:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteAnotacao(materialId: string) {
    try {
        await db.delete(materialChunks).where(eq(materialChunks.materialId, materialId));
        await db.delete(materials).where(eq(materials.id, materialId));
        revalidatePath("/dashboard/cadernos");
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao deletar anotação:", error);
        return { success: false, error: error.message };
    }
}
