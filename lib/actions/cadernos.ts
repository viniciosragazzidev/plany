'use server'

import { db } from "@/lib/db";
import { materials, studyBenches, materialChunks } from "@/lib/db/schema";
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

    const profile = await db.query.profiles.findFirst({
        where: (profiles, { eq }) => eq(profiles.userId, session.user.id)
    });

    if (!profile) return { success: true, benches: [] };

    const userBenches = await db.query.studyBenches.findMany({
        where: eq(studyBenches.id, studyBenches.id), // Just to trigger the query correctly or use findMany without where if needed
        // Fix: eq(studyBenches.profileId, profile.id) was correct, let's keep it
    });

    // Re-verify the filter logic for safety
    const benchesWithSubjects = await db.query.studyBenches.findMany({
        where: eq(studyBenches.profileId, profile.id),
        with: {
            subjects: true,
        }
    });

    const benchIds = benchesWithSubjects.map(b => b.id);

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
        benches: benchesWithSubjects, 
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
        const dataToUpdate: Record<string, any> = { content };
        if (title) dataToUpdate.title = title;

        // 1. Get current material to check hash and context
        const currentMaterial = await db.query.materials.findFirst({
            where: eq(materials.id, materialId)
        });

        if (!currentMaterial) throw new Error("Material não encontrado");

        // 2. Extrair texto e chunks inteligentes
        let plainText = "";
        const intelligentChunks: string[] = [];

        try {
            if (content.trim().startsWith("{")) {
                const parsed = JSON.parse(content);
                const extractText = (node: any): string => {
                    if (node.type === "text") return node.text || "";
                    if (node.content && Array.isArray(node.content)) {
                        return node.content.map(extractText).join("");
                    }
                    return "";
                };

                if (parsed.type === "doc" && Array.isArray(parsed.content)) {
                    // FRONTEND-DRIVEN CHUNKING: Agrupa por blocos lógicos do TipTap
                    let currentBatch = "";
                    parsed.content.forEach((block: any) => {
                        const blockText = extractText(block).trim();
                        if (!blockText) return;

                        // Se o bloco for um cabeçalho ou o batch estiver ficando grande, fecha o chunk
                        if (block.type === "heading" || (currentBatch.length + blockText.length > 1000)) {
                            if (currentBatch) intelligentChunks.push(currentBatch.trim());
                            currentBatch = blockText + "\n";
                        } else {
                            currentBatch += blockText + "\n";
                        }
                    });
                    if (currentBatch) intelligentChunks.push(currentBatch.trim());
                    
                    plainText = intelligentChunks.join("\n\n");
                } else {
                    plainText = content.replace(/<[^>]*>/g, " ");
                }
            } else {
                plainText = content.replace(/<[^>]*>/g, " ");
            }
        } catch {
            plainText = content.replace(/<[^>]*>/g, " ");
        }

        const newHash = createHash("sha256").update(plainText).digest("hex");
        
        // 3. Only update and re-vectorize if hash changed OR if chunks are missing
        const existingChunksCount = await db.select({ count: sql<number>`count(*)` }).from(materialChunks).where(eq(materialChunks.materialId, materialId));
        const hasNoChunks = existingChunksCount[0].count === 0;

        if (currentMaterial?.contentHash !== newHash || (hasNoChunks && plainText.trim().length > 0)) {
            // Update basic content first
            const [material] = await db.update(materials)
                .set(dataToUpdate)
                .where(eq(materials.id, materialId))
                .returning();

            if (plainText.trim().length > 0) {
                const { chunkMarkdown, getEmbedding, classifyChunk } = await import("@/lib/services/ai/ai-optimizations");
                
                // Fallback para chunkMarkdown se o parser de nodes falhou ou não retornou nada
                const chunksToProcess = intelligentChunks.length > 0 ? intelligentChunks : chunkMarkdown(plainText);
                
                try {
                    const newChunksData: { 
                        materialId: string; 
                        content: string; 
                        embedding: number[]; 
                        subjectId: string | null;
                        topicId: string | null;
                        originTag: string | null;
                    }[] = [];

                    // Processamento em série para evitar 429 excessivos, mas com IA rápida (Flash)
                    for (const chunk of chunksToProcess) {
                        const [embedding, originTag] = await Promise.all([
                            getEmbedding(chunk),
                            classifyChunk(chunk)
                        ]);

                        if (embedding) {
                            newChunksData.push({
                                materialId,
                                content: chunk,
                                embedding,
                                subjectId: currentMaterial.subjectId,
                                topicId: currentMaterial.editalItemId, // Assunto do edital vinculado
                                originTag
                            });
                        }
                    }
                    
                    if (newChunksData.length > 0) {
                        await db.transaction(async (tx) => {
                            await tx.delete(materialChunks).where(eq(materialChunks.materialId, materialId));
                            for (const nc of newChunksData) {
                                await tx.insert(materialChunks).values(nc);
                            }
                            await tx.update(materials).set({ contentHash: newHash }).where(eq(materials.id, materialId));
                        });
                    }
                } catch (err: any) {
                    console.error("Erro ao vetorizar anotação inteligente:", err);
                }
            }

            revalidatePath("/dashboard/cadernos");
            return { success: true, anotacao: material };
        } else if (title && currentMaterial.title !== title) {
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
