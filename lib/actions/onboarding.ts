"use server";

import { db } from "@/lib/db";
import { profiles, studyBenches, subjects } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export async function completeOnboarding(data: {
  name: string;
  studentLevel: "concurseiro" | "universitario" | "vestibulando" | "profissional";
  mainPainPoint: string;
  goalName: string;
  targetDate: string;
  weeklyHours: number;
  subjects: { title: string; priority: number; colorTag: string }[];
  examBoard?: string;
  examNotice?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Não autorizado");
  }

  const userId = session.user.id;

  try {
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
        })
        .returning();

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
    });
    
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bancadas");
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
  examBoard?: string;
  examNotice?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Não autorizado");
  }

  const userId = session.user.id;

  try {
    await db.transaction(async (tx) => {
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
        })
        .returning();

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
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/bancadas");
  } catch (error) {
    console.error("Erro ao criar bancada:", error);
    return { error: "Falha ao criar a bancada. Tente novamente." };
  }

  return { success: true };
}
