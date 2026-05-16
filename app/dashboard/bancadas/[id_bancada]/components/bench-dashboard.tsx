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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual Stats - More Integrated */}
          <Card className="lg:col-span-2 border-border/40 shadow-xl bg-background overflow-hidden relative group rounded-3xl">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                <HugeiconsIcon icon={ChartRadarIcon} size={240} />
            </div>
            <CardHeader className="p-8 pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black flex items-center gap-3 tracking-tight">
                    <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <HugeiconsIcon icon={ChartRadarIcon} size={18} />
                    </div>
                    Análise de Pontos Fracos
                </CardTitle>
                <Button variant="ghost" size="sm" className="rounded-xl text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5">
                    Ver Detalhes
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} className="ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[280px] flex items-center justify-center border-2 border-dashed border-border/40 rounded-[2.5rem] bg-secondary/5 group-hover:bg-secondary/10 transition-colors">
                <div className="text-center space-y-4 max-w-xs">
                    <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-primary/10 border border-border/50">
                        <HugeiconsIcon icon={ZapIcon} size={24} className="text-primary animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs font-black text-foreground uppercase tracking-widest">Sincronizando IA...</p>
                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                            Adicione mais materiais e realize simulados para que nossa IA mapeie seu DNA de aprendizado.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl h-8 px-4 text-[10px] font-bold uppercase tracking-widest border-primary/20 hover:bg-primary/5">
                        Gerar Simulado Agora
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side Content */}
          <div className="space-y-6">
             {/* Recent Notebook - Premium Feel */}
             <Card className="border-none shadow-xl bg-primary text-primary-foreground relative overflow-hidden group rounded-3xl cursor-pointer">
                <div className="absolute -right-6 -bottom-6 opacity-20 rotate-12 group-hover:rotate-0 transition-transform duration-500 pointer-events-none">
                   <HugeiconsIcon icon={Notebook01Icon} size={180} />
                </div>
                <CardHeader className="p-6 pb-2">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Última Revisão</p>
                   <CardTitle className="text-xl font-black mt-1 leading-tight tracking-tight">Direito Administrativo: Atos e Contratos</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-white/20 hover:bg-white/30 border-none text-white text-[10px] font-bold">85% Completo</Badge>
                        <span className="text-[10px] font-bold opacity-60 italic">há 15 min</span>
                    </div>
                    <Button className="w-full bg-white text-primary hover:bg-white/90 rounded-2xl font-black text-[11px] uppercase tracking-widest h-11 gap-2 mt-2">
                        Continuar Lendo
                        <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                    </Button>
                </CardContent>
             </Card>

             {/* Dynamic Shortcuts */}
             <div className="grid grid-cols-2 gap-3">
                {[
                    { label: 'Novo Mapa', icon: ZapIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Flashcards', icon: ZapIcon, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'Anotação', icon: ZapIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Relatório', icon: ZapIcon, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                ].map((action, i) => (
                    <button key={i} className="p-4 rounded-2xl border border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left group">
                        <div className={`w-8 h-8 rounded-lg ${action.bg} ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                            <HugeiconsIcon icon={action.icon} size={16} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{action.label}</span>
                    </button>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

