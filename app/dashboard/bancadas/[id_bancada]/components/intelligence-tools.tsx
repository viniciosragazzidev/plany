'use client'

import { HugeiconsIcon } from "@hugeicons/react";
import { 
  FlashIcon, 
  Quiz01Icon, 
  BrainIcon, 
  Yoga01Icon,
  Calendar02Icon,
  Settings01Icon,
  TargetIcon
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { differenceInDays } from "date-fns";

interface IntelligenceToolsProps {
  targetDate: string;
  weeklyHours: number;
}

export function IntelligenceTools({ targetDate, weeklyHours }: IntelligenceToolsProps) {
  const daysLeft = differenceInDays(new Date(targetDate), new Date());

  return (
    <div className="flex flex-col h-full bg-secondary/5 border-l border-border/50 w-72 shrink-0">
      <div className="p-6 border-b border-border/50 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
          <HugeiconsIcon icon={Settings01Icon} size={18} />
          Ferramentas
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Quick Actions */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">IA Insights</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 rounded-2xl bg-background border-border/50 hover:border-primary/50 transition-all">
              <HugeiconsIcon icon={Quiz01Icon} size={20} className="text-primary" />
              <span className="text-[10px] font-bold">Gerar Quiz</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 rounded-2xl bg-background border-border/50 hover:border-primary/50 transition-all">
              <HugeiconsIcon icon={FlashIcon} size={20} className="text-amber-500" />
              <span className="text-[10px] font-bold">Flashcards</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 rounded-2xl bg-background border-border/50 hover:border-primary/50 transition-all col-span-2">
              <HugeiconsIcon icon={BrainIcon} size={20} className="text-emerald-500" />
              <span className="text-[10px] font-bold">Resumo Estruturado</span>
            </Button>
          </div>
        </div>

        {/* Progress & Stats */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Seu Progresso</p>
          <Card className="p-4 rounded-2xl border-border/50 bg-background space-y-4">
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <HugeiconsIcon icon={Calendar02Icon} size={16} className="text-muted-foreground" />
                 <span className="text-xs font-bold">Contagem Regressiva</span>
               </div>
               <span className="text-xs font-bold text-primary">{daysLeft} dias</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground uppercase font-bold tracking-tight">Meta Semanal</span>
                <span className="font-bold">{weeklyHours}h/sem</span>
              </div>
              <div className="h-1.5 w-full bg-secondary/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[35%] rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
              </div>
            </div>
          </Card>
        </div>

        {/* Mental Health Tip */}
        <div className="mt-auto">
          <Card className="p-4 rounded-2xl border-primary/20 bg-primary/5 space-y-3 relative overflow-hidden group">
            <HugeiconsIcon icon={Yoga01Icon} size={40} className="absolute -right-4 -bottom-4 text-primary/10 group-hover:scale-125 transition-transform duration-500" />
            <div className="flex items-center gap-2 text-primary">
              <HugeiconsIcon icon={Yoga01Icon} size={16} />
              <span className="text-xs font-bold">Dica de Bem-estar</span>
            </div>
            <p className="text-[11px] leading-relaxed text-foreground/80 relative z-10">
              Estudos intensos pedem pausas. Use a técnica Pomodoro: 25min de foco e 5min de descanso para manter seu cérebro fresco.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
