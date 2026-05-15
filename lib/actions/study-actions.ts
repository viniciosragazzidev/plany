'use server'

import { db } from "@/lib/db";
import { subjects, editalItems, materials, quizzes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse, actionError, actionSuccess, IdSchema } from "./types";

/**
 * Interface for Subject Details
 */
export interface SubjectDetails {
  id: string;
  title: string;
  colorTag: string;
  progress: number;
  totalTopics: number;
  coveredTopics: number;
  materials: any[];
  quizzes: any[];
}

/**
 * Returns detailed progress and data for a specific subject
 */
export async function getSubjectDetails(subjectId: string): Promise<ActionResponse<SubjectDetails>> {
  // 1. Validation
  const validation = IdSchema.safeParse(subjectId);
  if (!validation.success) return actionError("ID de matéria inválido");

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return actionError("Não autorizado");

  try {
    // 2. Fetch Subject and verify ownership (via bench)
    const subject = await db.query.subjects.findFirst({
      where: eq(subjects.id, subjectId),
      with: {
        bench: {
          with: {
            profile: true
          }
        }
      }
    });

    if (!subject || subject.bench.profile.userId !== session.user.id) {
      return actionError("Matéria não encontrada ou acesso negado");
    }

    // 3. Fetch related data
    const [topics, subjectMaterials, subjectQuizzes] = await Promise.all([
      db.query.editalItems.findMany({
        where: and(
            eq(editalItems.benchId, subject.benchId),
            eq(editalItems.category, subject.title) // Assuming category matches title for now
        )
      }),
      db.query.materials.findMany({
        where: eq(materials.subjectId, subjectId),
        orderBy: (materials, { desc }) => [desc(materials.createdAt)]
      }),
      db.query.quizzes.findMany({
        where: eq(quizzes.subjectId, subjectId),
        orderBy: (quizzes, { desc }) => [desc(quizzes.createdAt)]
      })
    ]);

    const totalTopics = topics.length;
    const coveredTopics = topics.filter(t => t.isCovered).length;
    const progress = totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;

    return actionSuccess({
      id: subject.id,
      title: subject.title,
      colorTag: subject.colorTag,
      progress,
      totalTopics,
      coveredTopics,
      materials: subjectMaterials,
      quizzes: subjectQuizzes
    });

  } catch (error) {
    console.error("Error in getSubjectDetails:", error);
    return actionError("Erro ao recuperar detalhes da matéria");
  }
}
