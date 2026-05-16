'use client'

import { HugeiconsIcon } from "@hugeicons/react";
import { 
  ChartRadarIcon, 
  Clock01Icon, 
  Activity01Icon,
  Notebook01Icon,
  ZapIcon,
  ArrowRight01Icon,
  PlayIcon,
  Calendar03Icon,
  Target02Icon,
  AiChat01Icon
} from "@hugeicons/core-free-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBench } from "./bench-context";
import { useChatOverlay } from "@/hooks/use-chat-overlay";

export function BenchDashboard() {
  const { setSidebarState } = useBench();
  const { openChat } = useChatOverlay();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-background p-6 md:p-10 relative z-10">
      <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Hero Welcome - More Refined */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-2 py-0 text-[9px] font-black uppercase tracking-widest">
                Comando Central
              </Badge>
              <div className="h-px w-8 bg-border" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground leading-none">
              Oceano de <span className="text-primary">Conhecimento</span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-xl font-medium leading-relaxed">
              Base estratégica para sua aprovação. Monitore seu desempenho em tempo real e acelere seus estudos com IA.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" className="rounded-xl font-bold text-xs h-10 px-4 gap-2" onClick={() => openChat()}>
                <HugeiconsIcon icon={AiChat01Icon} size={16} className="text-primary" />
                Dúvida Rápida
             </Button>
             <Button size="sm" className="rounded-xl font-bold text-xs h-10 px-5 gap-2 shadow-lg shadow-primary/20" onClick={() => setSidebarState('quiz_config')}>
                <HugeiconsIcon icon={PlayIcon} size={16} fill="currentColor" />
                Iniciar Sessão
             </Button>
          </div>
        </div>

        {/* Stats Grid - Compact & Modern */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-border/40 shadow-sm bg-secondary/5 border-none relative overflow-hidden group">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <HugeiconsIcon icon={Clock01Icon} size={18} />
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-bold">+12% hoje</Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estudo Ativo</p>
                    <h3 className="text-2xl font-black tabular-nums mt-1">02:45<span className="text-xs text-muted-foreground ml-1">h</span></h3>
                  </div>
              </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm bg-secondary/5 border-none relative overflow-hidden group">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                        <HugeiconsIcon icon={Activity01Icon} size={18} />
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-600 border-none text-[9px] font-bold">Consistente</Badge>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Taxa de Acerto</p>
                    <h3 className="text-2xl font-black mt-1">84%</h3>
                  </div>
              </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm bg-secondary/5 border-none relative overflow-hidden group">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                        <HugeiconsIcon icon={Target02Icon} size={18} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Meta Diária</p>
                    <h3 className="text-2xl font-black mt-1">75%</h3>
                  </div>
              </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm bg-secondary/5 border-none relative overflow-hidden group">
              <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                        <HugeiconsIcon icon={Calendar03Icon} size={18} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dias Restantes</p>
                    <h3 className="text-2xl font-black mt-1">45<span className="text-xs text-muted-foreground ml-1">dias</span></h3>
                  </div>
              </CardContent>
          </Card>
        </div>

       
      </div>
    </div>
  );
}

