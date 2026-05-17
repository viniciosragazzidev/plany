'use server'

import { db } from "@/lib/db";
import { studyBenches, editalItems, subjects, publicEditais, publicSubjects, publicTopics } from "@/lib/db/schema";
import { eq, count, and, or } from "drizzle-orm";
import crypto from "crypto";
import { actionSuccess, actionError, ActionResponse } from "./types";
import { researchEmptyEditalTopics } from "@/lib/services/research/web-research";
import { scrapeSearchResults } from "@/lib/services/research/garimpo-scraper";
import { revalidatePath } from "next/cache";

export type GarimpoScenario = "A" | "B" | "C";

interface GarimpoState {
  scenario: GarimpoScenario;
  hasEdital: boolean;
  topicsCount: number;
}

/**
 * Valida o estado atual da bancada para determinar o fluxo de garimpo.
 */
export async function validateGarimpoState(benchId: string): Promise<ActionResponse<GarimpoState>> {
  try {
    const bench = await db.query.studyBenches.findFirst({
      where: eq(studyBenches.id, benchId),
      columns: {
        examNotice: true,
        hasDiscoveredTopics: true,
      }
    });

    if (!bench) return actionError("Bancada não encontrada");

    const topicsResult = await db
      .select({ val: count() })
      .from(editalItems)
      .where(eq(editalItems.benchId, benchId));

    const topicsCount = topicsResult[0]?.val || 0;
    const hasEdital = !!bench.examNotice && bench.examNotice.trim().length > 0;

    let scenario: GarimpoScenario = "C";
    
    // NOVO FLUXO: Se tem edital E ainda não rodou a descoberta, oferece (A)
    // Se já rodou a descoberta OU não tem edital mas tem tópicos, vai direto pro garimpo de materiais (B)
    // Se não tem nada e nem edital, bloqueia (C)
    if (hasEdital && !bench.hasDiscoveredTopics) scenario = "A";
    else if (topicsCount > 0) scenario = "B";
    else scenario = "C";

    return actionSuccess({
      scenario,
      hasEdital,
      topicsCount,
    }, "Estado validado com sucesso");
  } catch (error: any) {
    return actionError(error.message || "Erro ao validar estado do garimpo");
  }
}

/**
 * Descoberta de tópicos (Scenario A)
 */
export async function discoverTopicsAction(benchId: string): Promise<ActionResponse<Record<string, string[]>>> {
  try {
    const bench = await db.query.studyBenches.findFirst({
      where: eq(studyBenches.id, benchId),
    });

    if (!bench) return actionError("Bancada não encontrada");
    if (!bench.examNotice) return actionError("Edital não encontrado para extração");

    // FASE 1: Verificação de Cache Local/Global (Camadas 1 e 2)
    const rawContent = bench.examNoticeRaw || bench.examNotice || "";
    let fileHash = "NO-HASH";
    if (rawContent && rawContent.length > 0) {
      fileHash = crypto.createHash("sha256").update(rawContent).digest("hex");
    }
    const slugName = `${bench.goalName.toUpperCase().replace(/[^A-Z0-9]/g, '-')}-${(bench.examBoard || "INDEFINIDA").toUpperCase().replace(/[^A-Z0-9]/g, '-')}`.replace(/-+/g, '-').replace(/^-|-$/g, '');

    let publicEditalMatch = await db.query.publicEditais.findFirst({
      where: fileHash !== "NO-HASH" ? or(eq(publicEditais.fileHash, fileHash), eq(publicEditais.slugName, slugName)) : eq(publicEditais.slugName, slugName),
      with: { subjects: { with: { topics: true } } }
    });

    if (publicEditalMatch) {
       const grouped: Record<string, string[]> = {};
       publicEditalMatch.subjects.forEach((sub: any) => {
         grouped[sub.name] = sub.topics.map((t: any) => t.name);
       });
       await db.update(studyBenches).set({ publicEditalId: publicEditalMatch.id }).where(eq(studyBenches.id, bench.id));
       return actionSuccess(grouped, "Tópicos carregados instantaneamente do cache global (Hits Layers 1/2)");
    }

    // FASE DE PESQUISA PRÉVIA (Cache Miss Layers 1/2)
    let webContext = "";
    try {
      const syllabusQuery = `conteúdo programático oficial exaustivo edital ${bench.goalName} ${bench.examBoard || ""}`;
      const syllabusScrap = await scrapeSearchResults(syllabusQuery, "Syllabus Research", 3);
      webContext = syllabusScrap.map(s => s.markdownContent).join("\n\n---\n\n");
    } catch (e) {
      console.error("[Syllabus-Web] Erro ao pesquisar fontes externas:", e);
    }

    const discoveredData = await researchEmptyEditalTopics(bench.examNotice || bench.goalName, webContext);
    
    // FASE 2: Deduplicação Estrutural (Camada 3)
    if (discoveredData.metadata.institution && discoveredData.metadata.role && discoveredData.metadata.year) {
       publicEditalMatch = await db.query.publicEditais.findFirst({
         where: and(
           eq(publicEditais.institution, discoveredData.metadata.institution),
           eq(publicEditais.role, discoveredData.metadata.role),
           eq(publicEditais.year, discoveredData.metadata.year)
         ),
         with: { subjects: { with: { topics: true } } }
       });
    }

    if (publicEditalMatch) {
       const grouped: Record<string, string[]> = {};
       publicEditalMatch.subjects.forEach((sub: any) => {
         grouped[sub.name] = sub.topics.map((t: any) => t.name);
       });
       await db.update(studyBenches).set({ publicEditalId: publicEditalMatch.id }).where(eq(studyBenches.id, bench.id));
       return actionSuccess(grouped, "Tópicos carregados instantaneamente do cache global (Hit Layer 3)");
    }

    // FASE 3: Cache Miss Definitivo - Salvar no Cache Global
    let newPublicEditalId: string | undefined;
    if (discoveredData.metadata.institution) {
       try {
         await db.transaction(async (tx) => {
           const [newEdital] = await tx.insert(publicEditais).values({
             slugName,
             fileHash,
             institution: discoveredData.metadata.institution,
             role: discoveredData.metadata.role,
             year: discoveredData.metadata.year
           }).returning();
           newPublicEditalId = newEdital.id;

           const subjectsToInsert = discoveredData.subjects.map(s => ({
              publicEditalId: newEdital.id,
              name: s.trim().toUpperCase()
           }));

           if (subjectsToInsert.length > 0) {
              const insertedSubjects = await tx.insert(publicSubjects).values(subjectsToInsert).returning();
              const subMap = new Map();
              insertedSubjects.forEach(s => subMap.set(s.name, s.id));

              const topicsToInsert = discoveredData.items.map(i => {
                 const c = (i.category || "Geral").toUpperCase().trim();
                 return {
                    publicSubjectId: subMap.get(c) || insertedSubjects[0].id,
                    name: i.topic.trim()
                 };
              });

              if (topicsToInsert.length > 0) {
                 await tx.insert(publicTopics).values(topicsToInsert);
              }
           }
         });
         if (newPublicEditalId) {
            await db.update(studyBenches).set({ publicEditalId: newPublicEditalId }).where(eq(studyBenches.id, bench.id));
         }
       } catch (err) {
         console.error("Erro ao salvar no cache global (Ignorado)", err);
       }
    }

    // Output para a UI renderizar checkboxes
    const grouped: Record<string, string[]> = {};
    
    discoveredData.subjects.forEach(sub => {
      const normalized = sub.trim().toUpperCase();
      if (!grouped[normalized]) grouped[normalized] = [];
    });

    discoveredData.items.forEach(item => {
      const category = (item.category || "Geral").toUpperCase().trim();
      const topic = item.topic.trim();
      
      if (!grouped[category]) grouped[category] = [];
      if (topic && !grouped[category].includes(topic)) {
        grouped[category].push(topic);
      }
    });

    return actionSuccess(grouped, "Tópicos descobertos com sucesso");
  } catch (error: any) {
    return actionError(error.message || "Erro ao descobrir tópicos");
  }
}

export async function bulkCreateTopicsAction(
  benchId: string, 
  topicsByCategory: Record<string, string[]>
) {
  try {
    let createdCount = 0;
    const newSubjects: any[] = [];
    const newTopics: any[] = [];

    await db.transaction(async (tx) => {
      // 1. Get existing subjects for this bench to avoid duplicates
      const existingSubjects = await tx.query.subjects.findMany({
        where: eq(subjects.benchId, benchId),
      });

      const existingTitles = new Set(existingSubjects.map(s => s.title.toLowerCase().trim()));

      for (const [category, topics] of Object.entries(topicsByCategory)) {
        const categoryTrimmed = category.trim();
        
        // 2. Create Subject if it doesn't exist
        if (!existingTitles.has(categoryTrimmed.toLowerCase())) {
          const [newSub] = await tx.insert(subjects).values({
            benchId,
            title: categoryTrimmed,
            colorTag: "#" + Math.floor(Math.random()*16777215).toString(16), // Random color
            icon: "Folder",
            priority: 3,
          }).returning();
          existingTitles.add(categoryTrimmed.toLowerCase());
          newSubjects.push(newSub);
        }

        // 3. Insert Topics
        for (const topicName of topics) {
          const [newTop] = await tx.insert(editalItems).values({
            benchId,
            category: categoryTrimmed,
            topic: topicName.trim(),
            weight: 1,
            isCovered: false,
          }).returning();
          newTopics.push(newTop);
          createdCount++;
        }
      }

      // Marcar descoberta como realizada
      await tx.update(studyBenches)
        .set({ hasDiscoveredTopics: true })
        .where(eq(studyBenches.id, benchId));
    });

    revalidatePath(`/dashboard/bancadas/${benchId}`);
    return actionSuccess({ createdCount, newSubjects, newTopics }, `${createdCount} tópicos salvos no edital!`);
  } catch (error: any) {
    console.error("Erro ao salvar tópicos em massa:", error);
    return actionError(error.message || "Erro ao salvar tópicos em massa");
  }
}

/**
 * Garimpo via Form (Sem Bancada Criada)
 * Reutiliza a lógica de pesquisa web e IA para sugerir matérias e tópicos no onboarding.
 */
export async function garimparFormTopics(goalName: string, examBoard: string = ""): Promise<ActionResponse<{ subjects: string[], editalItems: { category: string, topic: string, weight: number }[] }>> {
  try {
    if (!goalName) return actionError("Nome do objetivo é obrigatório para garimpar.");

    const slugName = `${goalName.toUpperCase().replace(/[^A-Z0-9]/g, '-')}-${(examBoard || "INDEFINIDA").toUpperCase().replace(/[^A-Z0-9]/g, '-')}`.replace(/-+/g, '-').replace(/^-|-$/g, '');

    let publicEditalMatch = await db.query.publicEditais.findFirst({
      where: eq(publicEditais.slugName, slugName),
      with: { subjects: { with: { topics: true } } }
    });

    if (publicEditalMatch) {
       const subjectsSet = new Set<string>();
       const editalItems: { category: string, topic: string, weight: number }[] = [];
       
       publicEditalMatch.subjects.forEach((sub: any) => {
          subjectsSet.add(sub.name);
          sub.topics.forEach((t: any) => {
             editalItems.push({ category: sub.name, topic: t.name, weight: 1 });
          });
       });
       
       return actionSuccess({
         subjects: Array.from(subjectsSet),
         editalItems
       }, "Tópicos carregados instantaneamente do cache global!");
    }

    let webContext = "";
    try {
      const syllabusQuery = `conteúdo programático oficial exaustivo edital ${goalName} ${examBoard}`;
      const syllabusScrap = await scrapeSearchResults(syllabusQuery, "Syllabus Research", 3);
      webContext = syllabusScrap.map(s => s.markdownContent).join("\n\n---\n\n");
    } catch (e) {
      console.error("[Syllabus-Web] Erro ao pesquisar fontes externas:", e);
    }

    const discoveredData = await researchEmptyEditalTopics(`Concurso/Objetivo: ${goalName} ${examBoard}`, webContext);
    
    // FASE 2: Deduplicação Estrutural (Camada 3)
    if (discoveredData.metadata.institution && discoveredData.metadata.role && discoveredData.metadata.year) {
       publicEditalMatch = await db.query.publicEditais.findFirst({
         where: and(
           eq(publicEditais.institution, discoveredData.metadata.institution),
           eq(publicEditais.role, discoveredData.metadata.role),
           eq(publicEditais.year, discoveredData.metadata.year)
         ),
         with: { subjects: { with: { topics: true } } }
       });
    }

    if (publicEditalMatch) {
       const subjectsSet = new Set<string>();
       const editalItems: { category: string, topic: string, weight: number }[] = [];
       
       publicEditalMatch.subjects.forEach((sub: any) => {
          subjectsSet.add(sub.name);
          sub.topics.forEach((t: any) => {
             editalItems.push({ category: sub.name, topic: t.name, weight: 1 });
          });
       });
       
       return actionSuccess({
         subjects: Array.from(subjectsSet),
         editalItems
       }, "Tópicos carregados instantaneamente do cache global estrutural!");
    }

    // FASE 3: Cache Miss - Salvar no global
    if (discoveredData.metadata.institution) {
       try {
         await db.transaction(async (tx) => {
           const [newEdital] = await tx.insert(publicEditais).values({
             slugName,
             fileHash: "FORM-" + crypto.randomBytes(8).toString("hex"), // Fake hash since no file uploaded
             institution: discoveredData.metadata.institution,
             role: discoveredData.metadata.role,
             year: discoveredData.metadata.year
           }).returning();

           const subjectsToInsert = discoveredData.subjects.map(s => ({
              publicEditalId: newEdital.id,
              name: s.trim().toUpperCase()
           }));

           if (subjectsToInsert.length > 0) {
              const insertedSubjects = await tx.insert(publicSubjects).values(subjectsToInsert).returning();
              const subMap = new Map();
              insertedSubjects.forEach(s => subMap.set(s.name, s.id));

              const topicsToInsert = discoveredData.items.map(i => {
                 const c = (i.category || "Geral").toUpperCase().trim();
                 return {
                    publicSubjectId: subMap.get(c) || insertedSubjects[0].id,
                    name: i.topic.trim()
                 };
              });

              if (topicsToInsert.length > 0) {
                 await tx.insert(publicTopics).values(topicsToInsert);
              }
           }
         });
       } catch (err) {
         console.error("Erro ao salvar no cache global pelo form (Ignorado)", err);
       }
    }

    const subjectsSet = new Set<string>();
    const editalItems: { category: string, topic: string, weight: number }[] = [];

    discoveredData.subjects.forEach(sub => subjectsSet.add(sub.trim().toUpperCase()));

    discoveredData.items.forEach(item => {
      const category = (item.category || "Geral").toUpperCase().trim();
      const topic = item.topic.trim();
      
      subjectsSet.add(category);
      if (topic) {
        editalItems.push({ category, topic, weight: item.weight || 1 });
      }
    });

    return actionSuccess({
      subjects: Array.from(subjectsSet),
      editalItems
    }, "Tópicos garimpados com sucesso!");
  } catch (error: any) {
    return actionError(error.message || "Erro ao garimpar tópicos.");
  }
}
