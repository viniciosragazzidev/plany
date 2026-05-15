'use server'

import { db } from "@/lib/db";
import { studyBenches, editalItems, materials, subjects, profiles, quizAttempts, quizzes } from "@/lib/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
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
    const [allSubjects, allEditalItems, allMaterials, allQuizzes] = await Promise.all([
      db.query.subjects.findMany({ where: inArray(subjects.benchId, benchIds) }),
      db.query.editalItems.findMany({ where: inArray(editalItems.benchId, benchIds) }),
      db.query.materials.findMany({ where: inArray(materials.benchId, benchIds) }),
      db.query.quizzes.findMany({ where: inArray(quizzes.benchId, benchIds) }),
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

    // 6. Radar Data (Average of Coverage % and Quiz % by Subject)
    const subjectStatsMap: Record<string, { totalTopics: number, coveredTopics: number, totalQuizScore: number, quizCount: number }> = {};
    
    allEditalItems.forEach(item => {
      if (!subjectStatsMap[item.category]) {
        subjectStatsMap[item.category] = { totalTopics: 0, coveredTopics: 0, totalQuizScore: 0, quizCount: 0 };
      }
      subjectStatsMap[item.category].totalTopics++;
      if (item.isCovered) subjectStatsMap[item.category].coveredTopics++;
    });

    allQuizzes.forEach(quiz => {
      const subject = allSubjects.find(s => s.id === quiz.subjectId);
      if (subject && quiz.score !== null) {
        if (!subjectStatsMap[subject.title]) {
          subjectStatsMap[subject.title] = { totalTopics: 0, coveredTopics: 0, totalQuizScore: 0, quizCount: 0 };
        }
        subjectStatsMap[subject.title].totalQuizScore += quiz.score;
        subjectStatsMap[subject.title].quizCount++;
      }
    });

    const radarData = Object.entries(subjectStatsMap).map(([subject, stats]) => {
      const coveragePercent = stats.totalTopics > 0 ? (stats.coveredTopics / stats.totalTopics) * 100 : 0;
      const quizPercent = stats.quizCount > 0 ? (stats.totalQuizScore / stats.quizCount) : 0;
      
      // If we have quiz data, weight it (e.g., 60% coverage, 40% quiz)
      const finalProgress = stats.quizCount > 0 
        ? Math.round((coveragePercent * 0.6) + (quizPercent * 0.4))
        : Math.round(coveragePercent);

      return {
        subject,
        progress: finalProgress,
        fullMark: 100,
      };
    }).slice(0, 6);

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
    const pendingSubjects = Object.entries(subjectStatsMap)
      .map(([title, stats]) => {
          const subjectInfo = allSubjects.find(s => s.title === title);
          const coveragePercent = stats.totalTopics > 0 ? (stats.coveredTopics / stats.totalTopics) * 100 : 0;
          const quizPercent = stats.quizCount > 0 ? (stats.totalQuizScore / stats.quizCount) : 0;
          const finalProgress = stats.quizCount > 0 
            ? Math.round((coveragePercent * 0.6) + (quizPercent * 0.4))
            : Math.round(coveragePercent);

          return {
              id: subjectInfo?.id || title,
              title,
              progress: finalProgress,
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
