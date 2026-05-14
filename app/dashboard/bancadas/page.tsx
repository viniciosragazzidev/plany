import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { studyBenches, subjects, materials, profiles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BenchCard } from "./components/bench-card";
import { HugeiconsIcon } from "@hugeicons/react";
import { Plus, Search } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { CreateBenchDialog } from "@/components/onboarding/create-bench-dialog";

export default async function BancadasPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.userId, session.user.id),
  });

  if (!profile) {
    redirect("/dashboard");
  }

  // Fetch benches with subject and material counts using a direct SQL query for efficiency
  const benches = await db
    .select({
      id: studyBenches.id,
      goalName: studyBenches.goalName,
      targetDate: studyBenches.targetDate,
      weeklyHours: studyBenches.weeklyHours,
      subjectCount: sql<number>`CAST(count(distinct ${subjects.id}) AS INTEGER)`,
      materialCount: sql<number>`CAST(count(distinct ${materials.id}) AS INTEGER)`,
    })
    .from(studyBenches)
    .leftJoin(subjects, eq(subjects.benchId, studyBenches.id))
    .leftJoin(materials, eq(materials.subjectId, subjects.id))
    .where(eq(studyBenches.profileId, profile.id))
    .groupBy(studyBenches.id)
    .orderBy(sql`${studyBenches.createdAt} DESC`);

  return (
    <div className="flex flex-col flex-1 font-sans min-h-screen bg-background">
      <main className="p-8 space-y-8   mx-auto w-full">
        <div className="top-bar flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
             <h2 className="text-2xl font-bold tracking-tight text-foreground">Minhas Bancadas 📙</h2>
                <p className="text-muted-foreground">              Gerencie seus objetivos de estudo e acompanhe seu progresso.
</p>
          
          </div>
          
          <div className="flex gap-3 items-center w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <HugeiconsIcon icon={Search} size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar bancada..." 
                className="w-full pl-10 pr-4 py-2 bg-secondary/10 border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
              />
            </div>
            
            <CreateBenchDialog 
                trigger={
                    <Button className="rounded-xl gap-2 h-10 shadow-lg shadow-primary/20">
                        Nova Bancada
                        <HugeiconsIcon icon={Plus} size={18} />
                    </Button>
                }
            />
          </div>
        </div>

        {benches.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {benches.map((bench) => (
              <BenchCard key={bench.id} bench={bench as any} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-secondary/5 rounded-[3rem] border-2 border-dashed border-border/50">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <HugeiconsIcon icon={Plus} size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Nenhuma bancada encontrada</h3>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Você ainda não criou nenhuma bancada de estudo. Comece agora mesmo!
              </p>
            </div>
            <CreateBenchDialog 
                trigger={
                    <Button size="lg" className="rounded-2xl gap-2 h-12 px-8">
                        Criar Minha Primeira Bancada
                        <HugeiconsIcon icon={Plus} size={20} />
                    </Button>
                }
            />
          </div>
        )}
      </main>
    </div>
  );
}
