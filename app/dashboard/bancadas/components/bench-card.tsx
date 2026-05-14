'use client'

import { Card } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { Book01Icon, Calendar01Icon, File01Icon, LayersIcon, TimeQuarterPassIcon, FireIcon } from "@hugeicons/core-free-icons";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface BenchCardProps {
  bench: {
    id: string;
    goalName: string;
    targetDate: string;
    weeklyHours: number;
    subjectCount: number;
    materialCount: number;
  };
}

export function BenchCard({ bench }: BenchCardProps) {
  const targetDate = new Date(bench.targetDate);
  const daysLeft = differenceInDays(targetDate, new Date());
  
  const isUrgent = daysLeft <= 30 && daysLeft > 0;
  const isCritical = daysLeft <= 7 && daysLeft > 0;

  return (
    <Link href={`/dashboard/bancadas/${bench.id}`}>
      <Card className="p-6 rounded-[2rem] border border-border/50 bg-secondary/5 hover:bg-secondary/10 transition-all group cursor-pointer max-w-sm h-full flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
             <HugeiconsIcon icon={Book01Icon} size={28} />
          </div>
          {isUrgent && (
            <Badge variant={isCritical ? "destructive" : "default"} className={`rounded-xl px-3 py-1 gap-1.5 ${!isCritical ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20" : ""}`}>
              <HugeiconsIcon icon={FireIcon} size={14} />
              <span className="font-semibold">{isCritical ? "Crítico" : "Urgente"}</span>
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-xl tracking-tight group-hover:text-primary transition-colors line-clamp-2">{bench.goalName}</h3>
          <div className="flex items-center gap-2 text-muted-foreground">
            <HugeiconsIcon icon={Calendar01Icon} size={16} />
            <span className="text-sm font-medium">Até {format(targetDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>
        </div>

        <div className="mt-auto pt-6 flex flex-col gap-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Conteúdos</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <HugeiconsIcon icon={LayersIcon} size={16} className="text-primary" />
                  <span className="font-bold text-lg leading-none">{bench.subjectCount}</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Materiais</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <HugeiconsIcon icon={File01Icon} size={16} className="text-primary" />
                  <span className="font-bold text-lg leading-none">{bench.materialCount}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Intensidade</span>
              <div className="flex items-center gap-1.5 mt-0.5 text-primary">
                <HugeiconsIcon icon={TimeQuarterPassIcon} size={16} />
                <span className="font-bold text-lg leading-none">{bench.weeklyHours}h<span className="text-xs font-normal text-muted-foreground ml-0.5">/sem</span></span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
