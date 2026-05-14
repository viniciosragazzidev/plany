'use client'

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Notification, Plus, Search } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";

import { CreateBenchDialog } from "@/components/onboarding/create-bench-dialog";

export default function Dashboard() {
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();

  const userName = session?.user?.name?.split(" ")[0] || "Usuário";

  useEffect(() => {
    if (searchParams.get("onboarding") === "success") {
      toast.success("Bem-vindo ao BrainBench AI!", {
        description: "Seu cronograma está sendo gerado com base no seu perfil.",
      });
    }
  }, [searchParams]);

  return (
    <div className="flex flex-col flex-1 font-sans min-h-screen bg-background">
      <main className="p-8 space-y-8">
        <div className="top-bar flex justify-between items-center">
          <div className="space-y-1">
            {isPending ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Olá, {userName}!👌</h2>
                <p className="text-muted-foreground">Aqui é onde você pode gerenciar seu conteúdo.</p>
              </>
            )}
          </div>
          
          <div className="flex gap-3 items-center">
            <Button variant="outline" size="icon-sm" className="rounded-xl">
               <HugeiconsIcon icon={Search} size={18} />
            </Button>
            <Button variant="outline" size="icon-sm" className="rounded-xl relative">
               <HugeiconsIcon icon={Notification} size={18} />
               <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>
            
            <CreateBenchDialog 
                trigger={
                    <Button className="rounded-xl gap-2">
                        Nova Bancada
                        <HugeiconsIcon icon={Plus} size={18} />
                    </Button>
                }
            />
          </div>
        </div>
        
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-4 p-5 rounded-3xl border border-border/50 bg-secondary/10">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-2xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="aspect-video w-full rounded-2xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[80%]" />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <Skeleton className="h-8 w-20 rounded-xl" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <div className="grid gap-4 md:grid-cols-4">
                {[1, 2, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-3xl" />
                ))}
              </div>
            </div>
          </div>
      </main>
    </div>
  );
}
