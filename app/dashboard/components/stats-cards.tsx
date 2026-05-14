'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { Book01Icon, Target01Icon, File01Icon, FireIcon, LayersIcon } from "@hugeicons/core-free-icons";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardsProps {
  stats?: {
    totalSubjects: number;
    overallProgress: number;
    totalMaterials: number;
    studyStreak: number;
    totalBenches?: number;
  };
  isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  const items = [
    {
      title: "Bancadas",
      value: stats?.totalBenches || 0,
      icon: LayersIcon,
      description: "Bancadas ativas",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      title: "Matérias",
      value: stats?.totalSubjects || 0,
      icon: Book01Icon,
      description: "Total de disciplinas",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Progresso Geral",
      value: `${stats?.overallProgress || 0}%`,
      icon: Target01Icon,
      description: "Cobertura do edital",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Materiais",
      value: stats?.totalMaterials || 0,
      icon: File01Icon,
      description: "Arquivos processados",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-3xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item, index) => (
        <Card key={index} className="rounded-3xl border-border/50 bg-secondary/10 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.title}
            </CardTitle>
            <div className={`p-2 rounded-xl ${item.bg}`}>
              <HugeiconsIcon icon={item.icon} size={18} className={item.color} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {item.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
