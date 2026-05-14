'use server'

import { db } from "@/lib/db";
import { studyBenches, editalItems, materials, subjects, profiles } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { subDays, format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getDashboardData() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return { success: false, error: "Unauthorized" };

  try {
    // 1. Get Profile
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.userId, session.user.id),
    });

    if (!profile) return { success: false, error: "Profile not found" };

    // 2. Get Benches
    const benches = await db.query.studyBenches.findMany({
      where: eq(studyBenches.profileId, profile.id),
    });

    if (benches.length === 0) {
      return { 
        success: true, 
        data: {
          stats: { totalSubjects: 0, overallProgress: 0, totalMaterials: 0, studyStreak: 0 },
          radarData: [],
          activityData: [],
          pendingSubjects: [],
          isEmpty: true
        } 
      };
    }

    const benchIds = benches.map(b => b.id);

    // 3. Fetch all related data in parallel
    const [allSubjects, allEditalItems, allMaterials] = await Promise.all([
      db.query.subjects.findMany({ where: inArray(subjects.benchId, benchIds) }),
      db.query.editalItems.findMany({ where: inArray(editalItems.benchId, benchIds) }),
      db.query.materials.findMany({ where: inArray(materials.benchId, benchIds) }),
    ]);

    // 4. Calculate Stats
    const totalSubjects = allSubjects.length;
    const totalTopics = allEditalItems.length;
    const coveredTopics = allEditalItems.filter(i => i.isCovered).length;
    const overallProgress = totalTopics > 0 ? Math.round((coveredTopics / totalTopics) * 100) : 0;
    const totalMaterialsCount = allMaterials.length;

    // 5. Calculate Study Streak (simple version based on materials created at)
    const materialDates = new Set(allMaterials.map(m => format(m.createdAt, 'yyyy-MM-dd')));
    let streak = 0;
    let checkDate = startOfDay(new Date());
    
    while (materialDates.has(format(checkDate, 'yyyy-MM-dd'))) {
      streak++;
      checkDate = subDays(checkDate, 1);
    }
    // Also check if they studied yesterday if they haven't today yet
    if (streak === 0) {
        checkDate = subDays(startOfDay(new Date()), 1);
        while (materialDates.has(format(checkDate, 'yyyy-MM-dd'))) {
            streak++;
            checkDate = subDays(checkDate, 1);
        }
    }

    // 6. Radar Data (Subject vs % covered)
    // Map categories from editalItems to progress
    const subjectProgressMap: Record<string, { total: number, covered: number }> = {};
    allEditalItems.forEach(item => {
      if (!subjectProgressMap[item.category]) {
        subjectProgressMap[item.category] = { total: 0, covered: 0 };
      }
      subjectProgressMap[item.category].total++;
      if (item.isCovered) subjectProgressMap[item.category].covered++;
    });

    const radarData = Object.entries(subjectProgressMap).map(([subject, counts]) => ({
      subject,
      progress: Math.round((counts.covered / counts.total) * 100),
      fullMark: 100,
    })).slice(0, 6); // Top 6 for the radar chart

    // 7. Activity Data (Last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const interactions = allMaterials.filter(m => format(m.createdAt, 'yyyy-MM-dd') === dateStr).length;
      return {
        day: format(date, 'eee', { locale: ptBR }),
        interactions,
      };
    });

    // 8. Pending Subjects (Lowest progress)
    const pendingSubjects = Object.entries(subjectProgressMap)
      .map(([title, counts]) => {
          const subjectInfo = allSubjects.find(s => s.title === title);
          return {
              id: subjectInfo?.id || title,
              title,
              progress: Math.round((counts.covered / counts.total) * 100),
              colorTag: subjectInfo?.colorTag || "#ccc",
              benchId: subjectInfo?.benchId
          };
      })
      .sort((a, b) => a.progress - b.progress)
      .slice(0, 5);

    return {
      success: true,
      data: {
        stats: {
          totalSubjects,
          overallProgress,
          totalMaterials: totalMaterialsCount,
          studyStreak: streak,
          totalBenches: benches.length,
        },
        radarData,
        activityData: last7Days,
        pendingSubjects,
        isEmpty: false
      }
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return { success: false, error: "Failed to fetch dashboard data" };
  }
}
