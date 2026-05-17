'use server'

import { db } from "@/lib/db";
import { subjects, editalItems, materials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getBenchSubjects(benchId: string) {
  return await db.query.subjects.findMany({
    where: eq(subjects.benchId, benchId),
    orderBy: (subjects, { asc }) => [asc(subjects.priority)],
  });
}

export async function getBenchEditalItems(benchId: string) {
  return await db.query.editalItems.findMany({
    where: eq(editalItems.benchId, benchId),
  });
}

export async function getBenchMaterials(benchId: string) {
  return await db
    .select({
      id: materials.id,
      title: materials.title,
      type: materials.type,
      subjectId: materials.subjectId,
      editalItemId: materials.editalItemId,
      isPinned: materials.isPinned,
      storageUrl: materials.storageUrl,
      createdAt: materials.createdAt,
    })
    .from(materials)
    .where(eq(materials.benchId, benchId));
}

export async function getMaterialContent(materialId: string) {
  const result = await db
    .select({ content: materials.content })
    .from(materials)
    .where(eq(materials.id, materialId))
    .limit(1);
    
  return result[0]?.content || null;
}

