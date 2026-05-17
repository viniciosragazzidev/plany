"use client";

import { useState, useEffect, useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BrainIcon,
  ArrowLeft01Icon,
  Plus,
  SparklesIcon,
  CheckmarkCircle02Icon,
  AiChat02Icon,
  Note01Icon,
  InformationCircleIcon,
  Idea01Icon,
  StarsIcon
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useBench } from "./bench-context";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  getSummariesAction, 
  generateSummaryAction, 
  exportSummaryToNotebookAction 
} from "@/lib/actions/summaries";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

import { useChatOverlay } from "@/hooks/use-chat-overlay";

interface SummariesToolProps {
  benchId: string;
  subjects: { id: string; title: string }[];
  materials: { id: string; title: string; subjectId: string | null }[];
}

export function SummariesTool({ benchId, subjects, materials }: SummariesToolProps) {
  const { openChat } = useChatOverlay();
  const {
    sidebarState,
    setSidebarState,
    activeSummaryId,
    setActiveSummaryId,
    isGeneratingSummary,
    setIsGeneratingSummary,
    setExternalMessage
  } = useBench();

  const [summariesList, setSummariesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [activeSummaryData, setActiveSummaryData] = useState<any>(null);

  const loadingMessages = [
    "Digerindo os PDFs... 📚",
    "Simplificando as pegadinhas do edital... 🕵️",
    "Quase lá, preparando seu café digital ☕",
    "Traduzindo o academicismo... 🧬",
    "Mapeando conceitos fundamentais... 🗺️"
  ];
  
  const [currentLoadingMsg, setCurrentLoadingMsg] = useState(loadingMessages[0]);

  useEffect(() => {
    if (isGeneratingSummary) {
      const interval = setInterval(() => {
        setCurrentLoadingMsg(prev => {
          const idx = loadingMessages.indexOf(prev);
          return loadingMessages[(idx + 1) % loadingMessages.length];
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isGeneratingSummary]);

  const loadSummaries = async () => {
    setIsLoading(true);
    try {
      // Carrega todos os resumos da bancada, sem filtrar por matéria específica no início
      const res = await getSummariesAction(benchId);
      if (res.success) {
        setSummariesList(res.summaries || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sidebarState === 'summary_list' || sidebarState === 'active_summary') {
      loadSummaries();
    }
  }, [sidebarState]);

  const handleGenerate = async () => {
    if (selectedMaterials.length === 0) {
      toast.error("Selecione pelo menos um material.");
      return;
    }

    const firstMat = materials.find(m => m.id === selectedMaterials[0]);
    const subjectId = firstMat?.subjectId || (subjects.length > 0 ? subjects[0].id : null);

    if (!subjectId) return;

    setIsGeneratingSummary(true);
    toast.info("Iniciando construção do seu Mapa de Guerra... 🧠");

    try {
      const res = await generateSummaryAction(benchId, subjectId, selectedMaterials);
      if (res.success && res.summary) {
        if (res.message) toast.success(res.message);
        else toast.success("Resumo gerado com sucesso!");
        
        const data = JSON.parse(res.summary.content);
        setActiveSummaryData(data);
        setActiveSummaryId(res.summary.id);
        setSidebarState('active_summary');
        setSelectedMaterials([]);
        loadSummaries();
      } else {
        toast.error(res.error || "Erro ao gerar resumo");
      }
    } catch (error) {
      toast.error("Falha na IA ao processar materiais.");
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleExport = async () => {
    if (!activeSummaryData || !activeSummaryId) return;
    
    const firstMat = materials.find(m => m.subjectId !== null);
    const subjectId = firstMat?.subjectId || (subjects.length > 0 ? subjects[0].id : "");

    toast.promise(
      exportSummaryToNotebookAction(
        benchId, 
        subjectId, 
        activeSummaryData.title, 
        JSON.stringify(activeSummaryData)
      ),
      {
        loading: "Exportando para seus cadernos...",
        success: "Resumo enviado para os Cadernos! 📓",
        error: "Erro ao exportar resumo."
      }
    );
  };

  const handleAskInChat = (topicTitle: string) => {
    setExternalMessage(`Pode me explicar melhor sobre "${topicTitle}"?`);
    setSidebarState('default');
    openChat();
    toast.success("Dúvida enviada para o chat central!");
  };

  const materialsBySubject = useMemo(() => {
    const map: Record<string, any[]> = {};
    materials.forEach(m => {
      const subject = subjects.find(s => s.id === m.subjectId);
      const key = subject?.title || "Geral";
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [materials, subjects]);

  return (
    <>
      {/* SIDEBAR PANEL */}
      <div className="flex flex-col h-full w-full">
        {sidebarState === 'summary_list' && (
          <>
            <div className="p-6 border-b border-border/50 flex items-center gap-3 bg-background/50">
              <Button variant="ghost" size="icon-sm" onClick={() => setSidebarState('default')} className="rounded-xl h-8 w-8">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              </Button>
              <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                <HugeiconsIcon icon={BrainIcon} size={18} className="text-emerald-500" />
                Resumos Estruturados
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              <Button 
                onClick={() => setSidebarState('summary_config')} 
                className="w-full h-12 rounded-2xl gap-2 font-bold uppercase text-[10px] tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10"
                disabled={isGeneratingSummary || isLoading}
              >
                 <HugeiconsIcon icon={Plus} size={16} />
                 Novo Resumo
              </Button>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-20 w-full bg-secondary/10 animate-pulse rounded-2xl" />)}
                </div>
              ) : summariesList.length > 0 ? (
                <div className="space-y-3">
                  {summariesList.map((s) => (
                    <Card 
                      key={s.id} 
                      className="p-4 rounded-2xl border-border/50 hover:border-emerald-500/50 transition-all cursor-pointer group bg-background"
                      onClick={() => {
                        setActiveSummaryData(JSON.parse(s.content));
                        setActiveSummaryId(s.id);
                        setSidebarState('active_summary');
                      }}
                    >
                      <h4 className="text-sm font-bold group-hover:text-emerald-600 transition-colors line-clamp-1">
                        {s.title}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(s.createdAt).toLocaleDateString('pt-BR')} • {JSON.parse(s.content).timeline?.length || 0} tópicos
                      </p>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-6">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500/50 mx-auto mb-4">
                    <HugeiconsIcon icon={BrainIcon} size={24} />
                  </div>
                  <p className="text-xs text-muted-foreground italic">Nenhum resumo gerado ainda.</p>
                </div>
              )}
            </div>
          </>
        )}

        {sidebarState === 'summary_config' && (
          <>
            <div className="p-6 border-b border-border/50 flex items-center gap-3 bg-background/50">
              <Button variant="ghost" size="icon-sm" onClick={() => setSidebarState('summary_list')} className="rounded-xl h-8 w-8">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              </Button>
              <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
                <HugeiconsIcon icon={SparklesIcon} size={18} className="text-emerald-500" />
                Configurar Resumo
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
              {materials.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Materiais Base</p>
                  {Object.entries(materialsBySubject).map(([subject, mats]) => (
                    <div key={subject} className="space-y-2">
                      <h5 className="text-[11px] font-bold text-foreground/70 flex items-center gap-2">
                        <div className="w-1 h-3 bg-emerald-500 rounded-full" />
                        {subject}
                      </h5>
                      <div className="pl-3 space-y-2 border-l border-border/50 ml-0.5">
                        {mats.map(m => (
                          <div key={m.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={m.id} 
                              checked={selectedMaterials.includes(m.id)}
                              onCheckedChange={(checked) => {
                                if (checked) setSelectedMaterials(prev => [...prev, m.id]);
                                else setSelectedMaterials(prev => prev.filter(id => id !== m.id));
                              }}
                            />
                            <Label 
                              htmlFor={m.id}
                              className="text-[11px] leading-tight cursor-pointer font-medium text-muted-foreground hover:text-foreground transition-colors line-clamp-1"
                            >
                              {m.title}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center text-emerald-500 shadow-inner">
                    <HugeiconsIcon icon={InformationCircleIcon} size={32} />
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-black uppercase tracking-tight">Referência Vazia</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Nenhum material encontrado nas referências importadas para esta bancada.
                    </p>
                  </div>

                  <div className="w-full space-y-2 pt-4">
                    <Button 
                      variant="outline" 
                      className="w-full h-11 rounded-xl border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/5 gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                      onClick={() => setSidebarState('default')}
                    >
                      <HugeiconsIcon icon={SparklesIcon} size={16} className="text-emerald-500" />
                      Iniciar Garimpo
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full h-11 rounded-xl gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
                      onClick={() => setSidebarState('default')}
                    >
                      <HugeiconsIcon icon={Plus} size={16} />
                      Adicionar Manualmente
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {materials.length > 0 && (
              <div className="p-6 border-t border-border/50 bg-background/50">
                <Button 
                  className="w-full h-12 rounded-2xl gap-2 font-bold uppercase text-xs shadow-lg shadow-emerald-500/10 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleGenerate}
                  disabled={isGeneratingSummary || selectedMaterials.length === 0}
                >
                  {isGeneratingSummary ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <HugeiconsIcon icon={StarsIcon} size={18} />
                  )}
                  {isGeneratingSummary ? "Processando..." : "Gerar Resumo 2.0"}
                </Button>
                {isGeneratingSummary && (
                  <p className="text-[10px] text-center text-emerald-600 font-medium mt-3 animate-pulse italic">
                    {currentLoadingMsg}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* FULLSCREEN BOARD DIALOG */}
      <Dialog 
        open={sidebarState === 'active_summary' && activeSummaryData !== null} 
        onOpenChange={(open) => !open && setSidebarState('summary_list')}
      >
        <DialogContent className="max-w-none min-w-[95vw]   w-screen h-[95vh]  flex flex-col p-0 gap-0 overflow-hidden border-none shadow-none rounded-2xl outline-none bg-background/98 backdrop-blur-xl">
          <DialogHeader className="px-10 py-6 border-b border-emerald-500/10 flex-row items-center justify-between space-y-0 shrink-0 bg-secondary/5">
            <div className="flex flex-col gap-1 pr-8">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="w-fit border-emerald-500/30 text-emerald-600 bg-emerald-500/5 text-[9px] uppercase font-black tracking-[0.2em] px-2 py-0.5">Intelligence Map</Badge>
                <div className="h-0.5 w-4 bg-emerald-500/20" />
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Resumo Estruturado 2.0</span>
              </div>
              <DialogTitle className="text-2xl font-black text-foreground tracking-tight leading-tight">
                {activeSummaryData?.title}
              </DialogTitle>
            </div>
            
            <div className="flex items-center gap-4 shrink-0">
               <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                className="gap-2 rounded-xl border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all font-bold text-[11px] h-10 px-5 shadow-sm uppercase tracking-wider"
              >
                <HugeiconsIcon icon={Note01Icon} size={16} />
                Exportar para Cadernos
              </Button>
              <div className="w-px h-8 bg-border mx-1" />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSidebarState('summary_list')} 
                className="rounded-2xl h-10 w-10 hover:bg-destructive/10 hover:text-destructive transition-all border border-border"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={20} className="rotate-180" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 flex overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="w-full max-w-[1200px] mx-auto py-16 px-8 lg:px-16 space-y-16 relative">
                <div className="absolute left-[39px] lg:left-[71px] top-16 bottom-16 w-0.5 bg-gradient-to-b from-emerald-500 via-emerald-200 to-transparent opacity-20" />

                {activeSummaryData?.timeline.map((step: any, idx: number) => (
                  <div key={idx} className="relative pl-20 lg:pl-28 group animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both" style={{ animationDelay: `${idx * 150}ms` }}>
                    <div className="absolute left-0 lg:left-4 top-0 w-10 h-10 rounded-2xl bg-background border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 flex items-center justify-center text-emerald-600 text-base font-black group-hover:bg-emerald-500 group-hover:text-white group-hover:scale-110 transition-all z-10">
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <h4 className="text-xl lg:text-2xl font-black text-foreground tracking-tight group-hover:text-emerald-600 transition-colors">{step.step}</h4>
                          <div className="h-[1px] flex-1 bg-gradient-to-r from-emerald-500/10 to-transparent" />
                        </div>
                        <div className="text-sm text-muted-foreground leading-relaxed max-w-4xl font-medium prose prose-sm dark:prose-invert prose-headings:font-black prose-p:leading-relaxed prose-strong:text-foreground">
                          <ReactMarkdown>{step.content}</ReactMarkdown>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {step.analogy && (
                          <div className="group/card relative p-6 rounded-[2rem] bg-amber-50/20 border border-amber-200/40 transition-all hover:bg-amber-50/50 hover:shadow-xl hover:shadow-amber-500/5 overflow-hidden">
                            <div className="absolute right-0 top-0 p-4 text-amber-500/5 rotate-12 group-hover/card:rotate-0 transition-transform">
                              <HugeiconsIcon icon={Idea01Icon} size={60} />
                            </div>
                            <div className="space-y-4 relative z-10">
                              <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 uppercase tracking-widest">
                                <div className="p-1.5 rounded-lg bg-white shadow-sm">
                                  <HugeiconsIcon icon={Idea01Icon} size={14} />
                                </div>
                                Analogia Prática
                              </div>
                              <p className="text-xs text-amber-900 leading-relaxed font-bold italic">
                                &quot;{step.analogy}&quot;
                              </p>
                            </div>
                          </div>
                        )}

                        {step.masterTip && (
                          <div className="group/card relative p-6 rounded-[2rem] bg-emerald-50/20 border border-emerald-200/40 transition-all hover:bg-amber-50/50 hover:shadow-xl hover:shadow-emerald-500/5 overflow-hidden">
                            <div className="absolute right-0 top-0 p-4 text-emerald-500/5 -rotate-12 group-hover/card:rotate-0 transition-transform">
                              <HugeiconsIcon icon={StarsIcon} size={60} />
                            </div>
                            <div className="space-y-4 relative z-10">
                              <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                <div className="p-1.5 rounded-lg bg-white shadow-sm">
                                  <HugeiconsIcon icon={InformationCircleIcon} size={14} />
                                </div>
                                Dica de Mestre
                              </div>
                              <p className="text-xs text-emerald-900 leading-relaxed font-black">
                                {step.masterTip}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 pt-2">
                        <Button 
                          className="h-9 px-5 rounded-xl gap-2 text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-md shadow-emerald-500/10 hover:scale-105 transition-all"
                        >
                          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} />
                          Conceito Dominado
                        </Button>
                        <Button 
                          variant="ghost"
                          onClick={() => handleAskInChat(step.step)}
                          className="h-9 px-4 rounded-xl gap-2 text-[10px] font-bold text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-border/50"
                        >
                          <HugeiconsIcon icon={AiChat02Icon} size={14} />
                          Tirar Dúvida
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-24 pb-20 text-center space-y-8">
                   <div className="relative inline-block">
                     <div className="absolute inset-0 bg-emerald-500 blur-[60px] opacity-10" />
                     <div className="relative w-16 h-16 bg-emerald-500 shadow-xl shadow-emerald-500/20 rounded-[2rem] flex items-center justify-center mx-auto text-white">
                        <HugeiconsIcon icon={StarsIcon} size={24} />
                     </div>
                   </div>
                   <div className="space-y-3">
                     <h5 className="text-3xl font-black text-foreground tracking-tight leading-none">Mapa Completo!</h5>
                     <p className="text-base text-muted-foreground italic max-w-2xl mx-auto px-8 leading-relaxed font-medium">
                       &quot;{activeSummaryData?.conclusion}&quot;
                     </p>
                   </div>
                   <Button 
                    size="lg"
                    onClick={() => setSidebarState('summary_list')}
                    className="rounded-2xl h-11 px-8 text-xs font-black uppercase tracking-widest bg-foreground text-background hover:bg-emerald-600 transition-all"
                   >
                     Retornar para a Base
                   </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
