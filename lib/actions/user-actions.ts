'use server'

import { db } from "@/lib/db";
import { profiles, studyBenches, subjects, materials, materialChunks } from "@/lib/db/schema";
import { eq, count, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ActionResponse, actionError, actionSuccess } from "./types";

/**
 * Interface for Global User Stats
 */
export interface UserGlobalStats {
  totalBenches: number;
  totalSubjects: number;
  totalMaterials: number;
  totalChunks: number;
  storageUsedEstimate: string; // in MB/KB
}

/**
 * Returns global metrics for the current user
 */
export async function getUserGlobalStats(): Promise<ActionResponse<UserGlobalStats>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return actionError("Não autorizado");

  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, session.user.id),
    });

    if (!profile) return actionError("Perfil não encontrado");

    // 1. Total Benches
    const benchesCount = await db
      .select({ value: count() })
      .from(studyBenches)
      .where(eq(studyBenches.profileId, profile.id));

    const benches = await db.query.studyBenches.findMany({
      where: eq(studyBenches.profileId, profile.id),
      columns: { id: true }
    });
    
    const benchIds = benches.map(b => b.id);

    if (benchIds.length === 0) {
      return actionSuccess({
        totalBenches: 0,
        totalSubjects: 0,
        totalMaterials: 0,
        totalChunks: 0,
        storageUsedEstimate: "0 KB"
      });
    }

    // 2. Parallel counts for related data
    const [subjectsRes, materialsRes, chunksRes] = await Promise.all([
      db.select({ value: count() }).from(subjects).where(inArray(subjects.benchId, benchIds)),
      db.select({ value: count() }).from(materials).where(inArray(materials.benchId, benchIds)),
      db.select({ value: count() })
        .from(materialChunks)
        .innerJoin(materials, eq(materialChunks.materialId, materials.id))
        .where(inArray(materials.benchId, benchIds))
    ]);

    // Simple estimation: assume avg chunk is 1KB and avg metadata is small
    const totalChunks = chunksRes[0]?.value || 0;
    const estBytes = totalChunks * 1024;
    const storageUsed = estBytes > 1024 * 1024 
      ? `${(estBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(estBytes / 1024).toFixed(2)} KB`;

    return actionSuccess({
      totalBenches: benchesCount[0]?.value || 0,
      totalSubjects: subjectsRes[0]?.value || 0,
      totalMaterials: materialsRes[0]?.value || 0,
      totalChunks,
      storageUsedEstimate: storageUsed
    });

  } catch (error) {
    console.error("Error in getUserGlobalStats:", error);
    return actionError("Erro ao recuperar estatísticas globais");
  }
}

/**
 * Returns a summary of active workspaces/benches
 */
export async function getWorkspaceSummary(): Promise<ActionResponse<any[]>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return actionError("Não autorizado");

  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, session.user.id),
    });

    if (!profile) return actionError("Perfil não encontrado");

    const benches = await db.query.studyBenches.findMany({
      where: eq(studyBenches.profileId, profile.id),
      with: {
        subjects: {
          columns: {
            id: true,
            title: true,
            colorTag: true
          }
        }
      },
      orderBy: (studyBenches, { desc }) => [desc(studyBenches.createdAt)]
    });

    return actionSuccess(benches);
  } catch (error) {
    console.error("Error in getWorkspaceSummary:", error);
    return actionError("Erro ao recuperar resumo do workspace");
  }
}
