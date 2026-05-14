'use client'

import { HugeiconsIcon } from "@hugeicons/react";
import { 
  FlashIcon, 
  Quiz01Icon, 
  BrainIcon, 
  Yoga01Icon,
  Calendar02Icon,
  Settings01Icon,
  TargetIcon,
  FileAttachmentIcon,
  Plus
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { differenceInDays } from "date-fns";
import { WebResearchDialog } from "./web-research-dialog";
import { ImportEditalDialog } from "@/components/onboarding/import-edital-dialog";

import { MotivationalWidget } from "@/components/ui/motivational-widget";

interface IntelligenceToolsProps {
  targetDate: string;
  weeklyHours: number;
  benchId: string;
  editalItems?: { id: string; category: string; topic: string; isCovered: boolean }[];
  onMaterialsImported?: () => void;
}

export function IntelligenceTools({ targetDate, weeklyHours, benchId, editalItems = [], onMaterialsImported }: IntelligenceToolsProps) {
  const daysLeft = differenceInDays(new Date(targetDate), new Date());
  
  const totalCount = editalItems.length;
  const coveredCount = editalItems.filter(item => item.isCovered).length;
  const coveragePercent = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-secondary/5 border-l border-border/50 w-72 shrink-0 font-sans">
      <div className="p-6 border-b border-border/50 flex justify-between items-center bg-background/50">
        <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
          <HugeiconsIcon icon={Settings01Icon} size={18} />
          Ferramentas
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {/* Edital Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Edital Ativo</p>
            <ImportEditalDialog 
              benchId={benchId} 
              onSuccess={() => {}} 
              trigger={
                <Button variant="ghost" size="icon-xs" className="text-primary hover:bg-primary/10 h-6 w-6 rounded-lg transition-all">
                  <HugeiconsIcon icon={Plus} size={14} />
                </Button>
              }
            />
          </div>
          
          <Card className="p-4 rounded-2xl border-primary/20 bg-primary/5 space-y-3 group hover:border-primary/40 transition-all duration-300">
            <div className="flex items-center gap-2 text-primary">
              <HugeiconsIcon icon={FileAttachmentIcon} size={16} className="group-hover:rotate-12 transition-transform" />
              <span className="text-sm font-bold truncate">Conteúdo Programático</span>
            </div>
            
            {totalCount > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-primary/70 uppercase">
                  <span>Cobertura</span>
                  <span>{coveragePercent}%</span>
                </div>
                <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(var(--primary),0.3)]" 
                    style={{ width: `${coveragePercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  {coveredCount} de {totalCount} tópicos concluídos
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-2 px-4">Importe um PDF para extrair os tópicos.</p>
            )}
          </Card>
        </div>

        {/* Web Research Tool */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Garimpo Digital</p>
          <WebResearchDialog benchId={benchId} onSuccess={onMaterialsImported} />
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">IA Insights</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 rounded-2xl bg-background border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5">
              <HugeiconsIcon icon={Quiz01Icon} size={20} className="text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Gerar Quiz</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 rounded-2xl bg-background border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-amber-500/5">
              <HugeiconsIcon icon={FlashIcon} size={20} className="text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Flashcards</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2 rounded-2xl bg-background border-border/50 hover:border-primary/50 transition-all col-span-2 hover:shadow-lg hover:shadow-emerald-500/5">
              <HugeiconsIcon icon={BrainIcon} size={20} className="text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Resumo Estruturado</span>
            </Button>
          </div>
        </div>

        {/* Progress & Stats */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Seu Progresso</p>
          <Card className="p-4 rounded-2xl border-border/50 bg-background space-y-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <HugeiconsIcon icon={Calendar02Icon} size={16} className="text-muted-foreground" />
                 <span className="text-sm font-bold">Countdown</span>
               </div>
               <span className="text-sm font-bold text-primary animate-pulse">{daysLeft} dias</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                <span className="tracking-tight">Meta Semanal</span>
                <span>{weeklyHours}h/sem</span>
              </div>
              <div className="h-1.5 w-full bg-secondary/20 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[35%] rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)] transition-all duration-1000" />
              </div>
            </div>
          </Card>
        </div>

        {/* Mental Health Tip / Motivational Widget */}
        <div className="mt-auto pt-4">
          <MotivationalWidget />
        </div>
      </div>
    </div>
  );
}
