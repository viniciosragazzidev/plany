"use server";

import { db } from "@/lib/db";
import { profiles, studyBenches, subjects, editalItems, publicEditais, publicSubjects, publicTopics } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { ActionResponse, actionError, actionSuccess } from "./types";
import { selectPublicEdital, parseAndIndexEdital, checkExistingEdital } from "./public-edital";

export async function completeOnboarding(data: {
  name: string;
  studentLevel: "concurseiro" | "universitario" | "vestibulando" | "profissional";
  mainPainPoint: string;
  goalName: string;
  targetDate: string;
  weeklyHours: number;
  subjects: { title: string; priority: number; colorTag: string }[];
  editalItems?: { category: string; topic: string; description?: string; weight?: number }[];
  examBoard?: string;
  examNotice?: string;
  publicEditalId?: string | null;
  // Metadata for indexing if new
  rawMetadata?: { institution: string, role: string, year: string, contestName: string };
  fileHash?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Não autorizado");
  }

  const userId = session.user.id;

  try {
    let benchId = "";
    await db.transaction(async (tx) => {
      // 1. Criar Perfil
      const [profile] = await tx
        .insert(profiles)
        .values({
          userId,
          name: data.name,
          studentLevel: data.studentLevel,
          mainPainPoint: data.mainPainPoint,
        })
        .returning();

      // 2. Criar Bancada de Estudo
      const [bench] = await tx
        .insert(studyBenches)
        .values({
          profileId: profile.id,
          goalName: data.goalName,
          targetDate: data.targetDate,
          weeklyHours: data.weeklyHours,
          examBoard: data.examBoard,
          examNotice: data.examNotice,
          publicEditalId: data.publicEditalId,
        })
        .returning();
      
      benchId = bench.id;

      // 3. Criar Disciplinas
      if (data.subjects.length > 0) {
        await tx.insert(subjects).values(
          data.subjects.map((s) => ({
            benchId: bench.id,
            title: s.title,
            priority: s.priority,
            colorTag: s.colorTag,
          }))
        );
      }

      // 4. Criar Itens do Edital
      if (data.editalItems && data.editalItems.length > 0) {
        await tx.insert(editalItems).values(
          data.editalItems.map((item) => ({
            benchId: bench.id,
            category: item.category,
            topic: item.topic,
            description: item.description || "",
            weight: item.weight || 1,
          }))
        );
      }
    });

    // 5. Public Library Contribution
    if (data.publicEditalId && data.subjects.length === 0) {
      // Direct clone
      await selectPublicEdital(benchId, data.publicEditalId);
    } else if (!data.publicEditalId && data.rawMetadata && data.fileHash && data.subjects.length > 0) {
      // New Edital Indexing
      // We don't want to re-parse with AI here, we use the already parsed subjects/topics
      await indexNewPublicEdital(data.rawMetadata, data.fileHash, data.subjects, data.editalItems || []);
    }
    
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bancadas");
    revalidatePath("/dashboard/cadernos");
  } catch (error) {
    console.error("Erro no onboarding:", error);
    return { error: "Falha ao salvar os dados. Tente novamente." };
  }

  redirect("/dashboard?onboarding=success");
}

export async function createStudyBench(data: {
  goalName: string;
  targetDate: string;
  weeklyHours: number;
  subjects: { title: string; priority: number; colorTag: string }[];
  editalItems?: { category: string; topic: string; description?: string; weight?: number }[];
  examBoard?: string;
  examNotice?: string;
  publicEditalId?: string | null;
  rawMetadata?: { institution: string, role: string, year: string, contestName: string };
  fileHash?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Não autorizado");
  }

  const userId = session.user.id;

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Buscar Perfil
      const profile = await tx.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
      });

      if (!profile) throw new Error("Perfil não encontrado");

      // 2. Criar Bancada de Estudo
      const [bench] = await tx
        .insert(studyBenches)
        .values({
          profileId: profile.id,
          goalName: data.goalName,
          targetDate: data.targetDate,
          weeklyHours: data.weeklyHours,
          examBoard: data.examBoard,
          examNotice: data.examNotice,
          publicEditalId: data.publicEditalId,
        })
        .returning();

      // 3. Criar Disciplinas
      let createdSubjects: any[] = [];
      if (data.subjects.length > 0) {
        createdSubjects = await tx.insert(subjects).values(
          data.subjects.map((s) => ({
            benchId: bench.id,
            title: s.title,
            priority: s.priority,
            colorTag: s.colorTag,
          }))
        ).returning();
      }

      // 4. Criar Itens do Edital
      if (data.editalItems && data.editalItems.length > 0) {
        await tx.insert(editalItems).values(
          data.editalItems.map((item) => ({
            benchId: bench.id,
            category: item.category,
            topic: item.topic,
            description: item.description || "",
            weight: item.weight || 1,
          }))
        );
      }

      return { bench, subjects: createdSubjects };
    });

    // 5. Public Library Contribution
    if (data.publicEditalId && data.subjects.length === 0) {
      await selectPublicEdital(result.bench.id, data.publicEditalId);
    } else if (!data.publicEditalId && data.rawMetadata && data.fileHash && data.subjects.length > 0) {
      await indexNewPublicEdital(data.rawMetadata, data.fileHash, data.subjects, data.editalItems || []);
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bancadas");
    revalidatePath("/dashboard/cadernos");
    return { success: true, data: result };
  } catch (error) {
    console.error("Erro ao criar bancada:", error);
    return { error: "Falha ao criar a bancada. Tente novamente." };
  }
}

/**
 * Helper to index a new public edital without AI re-parsing.
 */
async function indexNewPublicEdital(
  metadata: { institution: string, role: string, year: string, contestName: string },
  fileHash: string,
  subjectsData: { title: string }[],
  topicsData: { category: string; topic: string }[]
) {
  try {
    // 1. SECONDARY CHECK: Before indexing, check if it exists (Atomic-ish)
    const existingId = await checkExistingEdital(metadata, fileHash);
    if (existingId) {
        console.log(`[indexNewPublicEdital] Skipping duplicate index for: ${metadata.contestName}`);
        return;
    }

    const baseForSlug = metadata.contestName || `${metadata.institution} ${metadata.role} ${metadata.year}`;
    const slugName = baseForSlug.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

    await db.transaction(async (tx) => {
      // 1. Create Public Edital
      const [pEdital] = await tx.insert(publicEditais).values({
        slugName,
        contestName: metadata.contestName,
        institution: metadata.institution,
        role: metadata.role,
        year: metadata.year,
        fileHash
      }).returning();


      // 2. Index Subjects and Topics
      for (const sub of subjectsData) {
        const [pSub] = await tx.insert(publicSubjects).values({
          publicEditalId: pEdital.id,
          name: sub.title
        }).returning();

        const relatedTopics = topicsData.filter(t => t.category === sub.title);
        for (const top of relatedTopics) {
          await tx.insert(publicTopics).values({
            publicSubjectId: pSub.id,
            name: top.topic
          });
        }
      }
    });
  } catch (err) {
    console.error("Failed to index new public edital in background:", err);
    // Non-blocking for the user
  }
}
