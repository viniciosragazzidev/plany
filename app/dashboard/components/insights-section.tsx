'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, SparklesIcon } from "@hugeicons/core-free-icons";

function CustomProgress({ value, color }: { value: number, color: string }) {
  return (
    <div className="w-full bg-secondary/30 rounded-full h-2 overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-500" 
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  )
}

interface InsightsSectionProps {
  pendingSubjects?: {
    id: string;
    title: string;
    progress: number;
    colorTag: string;
    benchId?: string;
  }[];
  userName: string;
  overallProgress: number;
  isLoading: boolean;
}

export function InsightsSection({ pendingSubjects, userName, overallProgress, isLoading }: InsightsSectionProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        <Skeleton className="md:col-span-2 h-[300px] rounded-3xl" />
        <Skeleton className="h-[300px] rounded-3xl" />
      </div>
    );
  }

  const getAdvice = () => {
    if (overallProgress === 0) return `Bem-vindo, ${userName}! Comece subindo seu primeiro edital para que eu possa organizar seus estudos.`;
    if (overallProgress < 30) return `Belo começo, ${userName}! Estamos na fase de fundação. Foco em manter a constância nesta semana.`;
    if (overallProgress < 70) return `Você está no ritmo certo! Já cobrimos uma boa parte. Que tal focar nas matérias com menor progresso hoje?`;
    return `Reta final, ${userName}! Você está quase dominando todo o edital. Hora de intensificar os simulados e revisões!`;
  };

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="md:col-span-2 rounded-3xl border-border/50 bg-secondary/10 overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="size-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <HugeiconsIcon icon={SparklesIcon} size={24} />
          </div>
          <div>
            <CardTitle>Insight do PLANY</CardTitle>
            <CardDescription>Mensagem da sua inteligência de estudos</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium leading-relaxed">
            &quot;{getAdvice()}&quot;
          </p>
          <div className="mt-6 flex gap-3">
            <Button 
                variant="outline" 
                className="rounded-xl" 
                render={<Link href="/dashboard/bancadas">Ver Minhas Bancadas</Link>} 
            />
            <Button className="rounded-xl gap-2">
                Continuar Estudando
                <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/50 bg-secondary/10 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Top 5 Pendentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingSubjects && pendingSubjects.length > 0 ? (
            pendingSubjects.map((subject, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center text-sm font-medium">
                  <span className="truncate max-w-[150px]">{subject.title}</span>
                  <span className="text-xs text-muted-foreground">{subject.progress}%</span>
                </div>
                <CustomProgress value={subject.progress} color={subject.colorTag} />
                {subject.benchId && (
                  <Link 
                    href={`/dashboard/bancadas/${subject.benchId}`}
                    className="text-[10px] text-primary hover:underline flex items-center gap-1"
                  >
                    Ir para bancada <HugeiconsIcon icon={ArrowRight01Icon} size={10} />
                  </Link>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhuma matéria pendente encontrada.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
