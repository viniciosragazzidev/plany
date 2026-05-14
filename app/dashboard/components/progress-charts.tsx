'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  ChartConfig, 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Bar, 
  BarChart, 
  XAxis, 
  CartesianGrid 
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProgressChartsProps {
  radarData?: {
    subject: string;
    progress: number;
    fullMark: number;
  }[];
  activityData?: {
    day: string;
    interactions: number;
  }[];
  isLoading: boolean;
}

const radarConfig = {
  progress: {
    label: "Progresso (%)",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

const barConfig = {
  interactions: {
    label: "Interações",
    color: "var(--color-primary)",
  },
} satisfies ChartConfig;

export function ProgressCharts({ radarData, activityData, isLoading }: ProgressChartsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[400px] rounded-3xl" />
        <Skeleton className="h-[400px] rounded-3xl" />
      </div>
    );
  }

  const hasRadarData = radarData && radarData.length > 0;
  const hasActivityData = activityData && activityData.length > 0;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="rounded-3xl border-border/50 bg-secondary/10 overflow-hidden">
        <CardHeader>
          <CardTitle>Equilíbrio de Conhecimento</CardTitle>
          <CardDescription>Progresso atual por disciplina</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[300px]">
          {hasRadarData ? (
            <ChartContainer config={radarConfig} className="w-full h-full">
              <RadarChart data={radarData}>
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <PolarGrid className="fill-muted/20" />
                <PolarAngleAxis dataKey="subject" />
                <Radar
                  name="Progresso"
                  dataKey="progress"
                  stroke="var(--color-progress)"
                  fill="var(--color-progress)"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground text-sm">
              <p>Sem dados de matérias disponíveis.</p>
              <p className="text-xs">Suba um edital para começar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/50 bg-secondary/10 overflow-hidden">
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Interações nos últimos 7 dias</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          {hasActivityData ? (
            <ChartContainer config={barConfig} className="w-full h-full">
              <BarChart data={activityData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted/50" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Bar
                  dataKey="interactions"
                  fill="var(--color-interactions)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
              <p>Sem atividade recente.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
