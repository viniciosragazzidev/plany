'use server'

import { db } from "@/lib/db";
import { materials, studyBenches, subjects, editalItems, materialChunks } from "@/lib/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createHash } from "crypto";

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

        // 1. Get current material to check hash
        const currentMaterial = await db.query.materials.findFirst({
            where: eq(materials.id, materialId)
        });

        // 2. Extrair texto legível para vetorização
        let plainText = "";
        try {
            if (content.trim().startsWith("{")) {
                const parsed = JSON.parse(content);
                // TipTap JSON logic
                const extractText = (node: any): string => {
                    if (node.type === "text") return node.text || "";
                    if (node.content && Array.isArray(node.content)) {
                        return node.content.map(extractText).join("");
                    }
                    return "";
                };

                if (parsed.type === "doc" && Array.isArray(parsed.content)) {
                    plainText = parsed.content.map((block: any) => {
                        return extractText(block);
                    }).filter(Boolean).join("\n\n");
                } else if (Array.isArray(parsed)) {
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
                // Markdown or Plain Text
                plainText = content.replace(/<[^>]*>/g, " ");
            }
        } catch (e) {
            plainText = content.replace(/<[^>]*>/g, " ");
        }

        const newHash = createHash("sha256").update(plainText).digest("hex");
        
        // 3. Only update and re-vectorize if hash changed OR if chunks are missing
        const existingChunks = await db.select({ count: sql<number>`count(*)` }).from(materialChunks).where(eq(materialChunks.materialId, materialId));
        const hasNoChunks = existingChunks[0].count === 0;

        if (currentMaterial?.contentHash !== newHash || (hasNoChunks && plainText.trim().length > 0)) {
            // Update basic content first
            const [material] = await db.update(materials)
                .set(dataToUpdate)
                .where(eq(materials.id, materialId))
                .returning();

            if (plainText.trim().length > 0) {
                // Fatiamento e Vetorização
                const { chunkMarkdown, getEmbedding } = await import("@/lib/ai-optimizations");
                const chunks = chunkMarkdown(plainText);
                
                try {
                    const newChunks: { materialId: string; content: string; embedding: number[] }[] = [];
                    for (const chunk of chunks) {
                        const embedding = await getEmbedding(chunk);
                        if (embedding) {
                            newChunks.push({
                                materialId,
                                content: chunk,
                                embedding
                            });
                        }
                    }
                    
                    // Se conseguimos vetorizar pelo menos um chunk, atualizamos os chunks e o hash
                    if (newChunks.length > 0) {
                        await db.transaction(async (tx) => {
                            await tx.delete(materialChunks).where(eq(materialChunks.materialId, materialId));
                            for (const nc of newChunks) {
                                await tx.insert(materialChunks).values(nc);
                            }
                            // Atualiza o hash APENAS após sucesso na vetorização
                            await tx.update(materials).set({ contentHash: newHash }).where(eq(materials.id, materialId));
                        });
                    }
                } catch (err: any) {
                    console.error("Erro ao vetorizar anotação (Quota ou API):", err);
                }
            }

            revalidatePath("/dashboard/cadernos");
            return { success: true, anotacao: material };
        } else if (title && currentMaterial.title !== title) {
            // Só título mudou
            const [material] = await db.update(materials)
                .set({ title })
                .where(eq(materials.id, materialId))
                .returning();
            revalidatePath("/dashboard/cadernos");
            return { success: true, anotacao: material };
        }

        return { success: true };
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
