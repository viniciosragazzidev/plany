'use client'

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { CreateBenchDialog } from "@/components/onboarding/create-bench-dialog";
import { NotificationCenter } from "./components/ui/notification-center";
import { StatsCards } from "./components/stats-cards";
import { ProgressCharts } from "./components/progress-charts";
import { InsightsSection } from "./components/insights-section";
import { DashboardEmptyState } from "./components/empty-state";
import { getDashboardData } from "@/lib/actions/dashboard";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const { data: session, isPending: isSessionPending } = authClient.useSession();

  const { data: dashboardResponse, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const result = await getDashboardData();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!session?.user?.id,
  });

  const userName = session?.user?.name?.split(" ")[0] || "Usuário";

  useEffect(() => {
    if (searchParams.get("onboarding") === "success") {
      toast.success("Bem-vindo ao BrainBench AI!", {
        description: "Seu cronograma está sendo gerado com base no seu perfil.",
      });
    }
  }, [searchParams]);

  const isLoading = isSessionPending || isDashboardLoading;
  const isEmpty = dashboardResponse?.isEmpty && !isLoading;

  return (
    <div className="flex flex-col flex-1 font-sans min-h-screen bg-background">
      <main className="p-8 space-y-8 max-w-7xl mx-auto w-full">
        <div className="top-bar flex justify-between items-center">
          <div className="space-y-1">
            {isSessionPending ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Olá, {userName}!👌</h2>
                <p className="text-muted-foreground">Aqui está o resumo do seu progresso acadêmico.</p>
              </>
            )}
          </div>
          
          <div className="flex gap-3 items-center">
            <Button variant="outline" size="icon" className="rounded-xl size-10">
               <HugeiconsIcon icon={Search} size={18} />
            </Button>
            <NotificationCenter />
            
            <CreateBenchDialog 
                trigger={
                    <Button className="rounded-xl gap-2 hidden md:flex">
                        Nova Bancada
                        <HugeiconsIcon icon={Plus} size={18} />
                    </Button>
                }
            />
          </div>
        </div>
        
        {isEmpty ? (
          <DashboardEmptyState />
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* 1. Quick Stats */}
            <StatsCards stats={dashboardResponse?.stats} isLoading={isLoading} />

            {/* 2. Visualização de Progresso (Gráficos) */}
            <ProgressCharts 
              radarData={dashboardResponse?.radarData} 
              activityData={dashboardResponse?.activityData}
              isLoading={isLoading} 
            />

            {/* 3. Insights e Feedbacks */}
            <InsightsSection 
              pendingSubjects={dashboardResponse?.pendingSubjects}
              userName={userName}
              overallProgress={dashboardResponse?.stats?.overallProgress || 0}
              isLoading={isLoading}
            />
          </div>
        )}
      </main>
    </div>
  );
}
