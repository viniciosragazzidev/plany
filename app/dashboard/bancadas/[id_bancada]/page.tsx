import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { studyBenches, profiles, subjects, materials, editalItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, Book01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SourceColumn } from "./components/source-column";
import { ChatBench } from "./components/chat-bench";
import { IntelligenceTools } from "./components/intelligence-tools";
import { DeleteBenchButton } from "./components/delete-bench-button";
import { NotificationCenter } from "../../components/ui/notification-center";

import { BenchProvider } from "./components/bench-context";

export default async function BenchDetailPage({
  params,
}: {
  params: Promise<{ id_bancada: string }>;
}) {
  const { id_bancada } = await params;
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

  const bench = await db.query.studyBenches.findFirst({
    where: and(
      eq(studyBenches.id, id_bancada),
      eq(studyBenches.profileId, profile.id)
    ),
  });

  if (!bench) {
    notFound();
  }

  const benchMaterials = await db
    .select({
      id: materials.id,
      title: materials.title,
      type: materials.type,
      subjectId: materials.subjectId,
      editalItemId: materials.editalItemId,
      isPinned: materials.isPinned,
      subjectTitle: subjects.title,
    })
    .from(materials)
    .leftJoin(subjects, eq(materials.subjectId, subjects.id))
    .where(eq(materials.benchId, bench.id));

  const items = await db.query.editalItems.findMany({
    where: eq(editalItems.benchId, bench.id),
  });

  const benchSubjects = await db.query.subjects.findMany({
    where: eq(subjects.benchId, bench.id),
  });

  return (
    <BenchProvider 
      initialSubjects={benchSubjects.map(s => s.id)} 
      benchId={bench.id} 
      initialResearchStatus={bench.researchStatus}
    >
      <div className="flex flex-col h-screen bg-background overflow-hidden font-sans">
        {/* Top Header */}
        <header className="h-16 border-b border-border/50 px-6 flex items-center justify-between bg-background/80 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/bancadas">
              <Button variant="ghost" size="icon-sm" className="rounded-xl hover:bg-secondary/80 h-9 w-9">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
              </Button>
            </Link>
            <div className="h-4 w-px bg-border/50 mx-1" />
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <HugeiconsIcon icon={Book01Icon} size={16} />
               </div>
               <h2 className="text-lg font-bold tracking-tight text-foreground truncate max-w-[200px] md:max-w-md">
                  {bench.goalName}
               </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon-sm" className="rounded-xl h-9 w-9">
              <HugeiconsIcon icon={Search01Icon} size={18} className="text-muted-foreground" />
            </Button>
            <NotificationCenter />
            <div className="h-4 w-px bg-border/50 mx-2" />
            <DeleteBenchButton benchId={bench.id} />
          </div>
        </header>

        {/* Main Content: 3 Columns */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Column: Sources */}
          <SourceColumn 
            benchId={bench.id} 
            materials={benchMaterials as any} 
            editalItems={items as any}
            subjects={benchSubjects as any}
          />

          {/* Center Column: AI Chat */}
          <ChatBench />

          {/* Right Column: Intelligence Tools */}
          <IntelligenceTools 
            targetDate={bench.targetDate} 
            weeklyHours={bench.weeklyHours}
            benchId={bench.id}
            editalItems={items as any}
            subjects={benchSubjects as any}
          />
        </div>
      </div>
    </BenchProvider>
  );
}
