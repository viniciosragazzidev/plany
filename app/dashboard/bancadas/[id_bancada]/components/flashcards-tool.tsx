'use client'

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FlashIcon,
  Plus,
  ArrowLeft01Icon,
  Tick01Icon,
  Cancel01Icon,
  SparklesIcon,
  Settings01Icon,
  Book01Icon,
  RefreshDotIcon,
  CheckmarkCircle02Icon
} from "@hugeicons/core-free-icons";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBench } from "./bench-context";
import {
  getFlashcardStatsAction,
  generateFlashcardsAction,
  getFlashcardsForReviewAction,
  submitFlashcardReviewAction
} from "@/lib/actions/flashcards";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FlashcardsToolProps {
  benchId: string;
  subjects: { id: string; title: string }[];
  materials?: { id: string; title: string; subjectId: string | null }[];
}

export function FlashcardsTool({ benchId, subjects, materials = [] }: FlashcardsToolProps) {
  const {
    sidebarState,
    setSidebarState,
    isGeneratingFlashcards,
    setIsGeneratingFlashcards,
    activeFlashcardSubjectId,
    setActiveFlashcardSubjectId
  } = useBench();

  const [stats, setStats] = useState<{ total: number; dueForReview: number } | null>(null);
  const [reviewCards, setReviewCards] = useState<any[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("IA garimpando materiais...");

  const loadingMessages = [
    "IA garimpando materiais...",
    "Sintetizando conceitos chave...",
    "Estruturando repetição espaçada...",
    "Otimizando seu cérebro de elite...",
    "Quase lá, preparando a revisão...",
    "Mapeando conexões neurais..."
  ];

  useEffect(() => {
    let interval: any;
    if (isGeneratingFlashcards) {
      let index = 0;
      interval = setInterval(() => {
        index = (index + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[index]);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGeneratingFlashcards]);

  const loadStats = async () => {
    const res = await getFlashcardStatsAction(benchId);
    if (res.success && res.total !== undefined && res.dueForReview !== undefined) {
      setStats({ total: res.total, dueForReview: res.dueForReview });
    }
  };

  useEffect(() => {
    if (sidebarState === 'flashcard_list') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadStats();
    }
  }, [sidebarState, benchId]);

  const startReview = async (subjectId?: string) => {
    setIsLoading(true);
    const res = await getFlashcardsForReviewAction(benchId, subjectId);
    if (res.success && res.flashcards && res.flashcards.length > 0) {
      setReviewCards(res.flashcards);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setSidebarState('flashcard_study');
    } else {
      toast.info("Tudo em dia! Nenhuma revisão necessária no momento. 🚀");
    }
    setIsLoading(false);
  };

  const handleGenerate = async (subjectId: string, materialId: string) => {
    setIsGeneratingFlashcards(true);

    try {
      const res = await generateFlashcardsAction(benchId, subjectId, materialId);
      if (res.success) {
        toast.success(`Criamos ${res.count} flashcards de elite para você!`);
        loadStats();
        setSidebarState('flashcard_list');
      } else {
        toast.error(res.error || "Erro ao gerar flashcards");
      }
    } catch (e) {
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  const materialsBySubject = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    materials.forEach(m => {
      const subject = subjects.find(s => s.id === m.subjectId);
      const key = subject?.title || "Geral";
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [materials, subjects]);

  const handleReview = async (performance: number) => {
    const card = reviewCards[currentCardIndex];
    await submitFlashcardReviewAction(card.id, performance);

    if (currentCardIndex < reviewCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      toast.success("Sessão concluída! Seu cérebro agradece. 🧠✨");
      setSidebarState('flashcard_list');
      loadStats();
    }
  };

  // --- RENDERS ---

  if (isGeneratingFlashcards) {
    return (
      <div className="flex flex-col h-full bg-secondary/5 border-l border-border/50 w-80 shrink-0 font-sans animate-in slide-in-from-right duration-300">
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <HugeiconsIcon icon={FlashIcon} size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold">Gerando Flashcards</h3>
            <p className="text-sm text-muted-foreground animate-pulse duration-1000 h-10 flex items-center justify-center">
              {loadingMessage}
            </p>
          </div>

          <div className="w-full max-w-[200px] h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-progress-infinite" />
          </div>

          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest pt-4">
            Isso pode levar alguns segundos
          </p>
        </div>
      </div>
    );
  }

  if (sidebarState === 'flashcard_config') {
    return (
      <div className="flex flex-col h-full bg-secondary/5 border-l border-border/50 w-80 shrink-0 font-sans animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-border/50 flex items-center gap-3 bg-background/50">
          <Button variant="ghost" size="icon-sm" onClick={() => setSidebarState('flashcard_list')} className="rounded-xl h-8 w-8">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </Button>
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
            <HugeiconsIcon icon={Settings01Icon} size={18} className="text-primary" />
            Configurar Flashcards
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {materials && materials.length > 0 ? (
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Escolha 1 Material (Base)</p>
              {Object.entries(materialsBySubject).map(([subject, mats]) => (
                <div key={subject} className="space-y-2">
                  <h5 className="text-[11px] font-bold text-foreground/70 flex items-center gap-2">
                    <div className="w-1 h-3 bg-amber-500 rounded-full" />
                    {subject}
                  </h5>
                  <div className="space-y-2 pl-2">
                    {mats.map(m => (
                      <Card
                        key={m.id}
                        className="p-3 rounded-xl border-border/50 hover:border-amber-500/50 transition-all cursor-pointer bg-background flex items-center justify-between group"
                        onClick={() => {
                          const subj = subjects.find(s => s.title === subject);
                          handleGenerate(subj?.id || (subjects.length > 0 ? subjects[0].id : ""), m.id);
                        }}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-amber-500 bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors">
                            <HugeiconsIcon icon={Book01Icon} size={14} />
                          </div>
                          <span className="text-xs font-medium truncate">{m.title}</span>
                        </div>
                        <HugeiconsIcon icon={SparklesIcon} size={14} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center mt-10">Nenhum material encontrado.</p>
          )}
        </div>
      </div>
    );
  }

  if (sidebarState === 'flashcard_study') {
    const card = reviewCards[currentCardIndex];

    return (
      <div className="flex flex-col h-full bg-secondary/5 border-l border-border/50 w-80 shrink-0 font-sans animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-border/50 flex items-center justify-between bg-background/50">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={() => setSidebarState('flashcard_list')} className="rounded-xl h-8 w-8">
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
            </Button>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Revisão Ativa</span>
          </div>
          <Badge variant="secondary" className="text-[10px] font-bold">
            {currentCardIndex + 1} / {reviewCards.length}
          </Badge>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center justify-center gap-8">
          {/* Flashcard Component */}
          <div
            className="relative w-full aspect-[3/4] cursor-pointer perspective-1000 group"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={cn(
              "w-full h-full transition-all duration-500 preserve-3d relative",
              isFlipped ? "rotate-y-180" : ""
            )}>
              {/* Front */}
              <Card className="absolute inset-0 w-full h-full p-8 flex flex-col items-center justify-center text-center backface-hidden rounded-[2rem] border-2 border-primary/20 bg-background shadow-xl">
                <HugeiconsIcon icon={FlashIcon} size={32} className="text-primary/20 mb-6" />
                <h3 className="text-lg font-bold leading-tight">{card?.front}</h3>
                <p className="text-[10px] text-muted-foreground mt-8 uppercase tracking-widest font-bold opacity-50">Toque para revelar</p>
              </Card>

              {/* Back */}
              <Card className="absolute inset-0 w-full h-full p-8 flex flex-col items-center justify-center text-center backface-hidden rotate-y-180 rounded-[2rem] border-2 border-emerald-500/20 bg-background shadow-xl">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} className="text-emerald-500/20 mb-6" />
                <p className="text-md font-medium text-foreground/90">{card?.back}</p>
              </Card>
            </div>
          </div>

          {/* Feedback Buttons (Only visible when flipped) */}
          <div className={cn(
            "grid grid-cols-4 gap-2 w-full transition-all duration-300",
            isFlipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}>
            {[
              { val: 0, label: "Esqueci", color: "bg-red-500" },
              { val: 3, label: "Difícil", color: "bg-orange-500" },
              { val: 4, label: "Bom", color: "bg-blue-500" },
              { val: 5, label: "Fácil", color: "bg-emerald-500" }
            ].map((btn) => (
              <Button
                key={btn.val}
                variant="outline"
                className="flex-col h-16 gap-1 rounded-2xl hover:border-foreground/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReview(btn.val);
                }}
              >
                <div className={cn("w-2 h-2 rounded-full", btn.color)} />
                <span className="text-[9px] font-bold uppercase">{btn.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-secondary/5 border-l border-border/50 w-80 shrink-0 font-sans animate-in slide-in-from-right duration-300">
      <div className="p-6 border-b border-border/50 flex items-center gap-3 bg-background/50">
        <Button variant="ghost" size="icon-sm" onClick={() => setSidebarState('default')} className="rounded-xl h-8 w-8">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
        </Button>
        <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
          <HugeiconsIcon icon={FlashIcon} size={18} className="text-amber-500" />
          Meus Flashcards
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {/* Stats Section */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 rounded-2xl bg-background border-border/50 text-center space-y-1">
              <span className="text-2xl font-black text-foreground">{stats.total}</span>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Total</p>
            </Card>
            <Card className="p-4 rounded-2xl bg-amber-500/5 border-amber-500/20 text-center space-y-1">
              <span className="text-2xl font-black text-amber-500">{stats.dueForReview}</span>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-tighter">Para Revisar</p>
            </Card>
          </div>
        )}

        <div className="space-y-3">
          <Button
            className="w-full h-12 rounded-2xl gap-2 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-amber-500/10 bg-amber-500 hover:bg-amber-600 text-white"
            onClick={() => setSidebarState('flashcard_config')}
            disabled={isGeneratingFlashcards}
          >
            {isGeneratingFlashcards ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <HugeiconsIcon icon={Plus} size={16} />
            )}
            {isGeneratingFlashcards ? "Gerando..." : "Novos Flashcards"}
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl gap-2 font-bold uppercase text-[10px] tracking-widest"
            onClick={() => startReview()}
            disabled={isLoading || (stats?.dueForReview === 0)}
          >
            <HugeiconsIcon icon={RefreshDotIcon} size={16} className="text-amber-500" />
            Revisar Agora
          </Button>
        </div>

        {/* Subjects List */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] ml-1">Por Disciplina</p>
          <div className="space-y-2">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl border border-border/50 bg-background flex items-center justify-between hover:border-amber-500/50 transition-all cursor-pointer group"
                onClick={() => startReview(s.id)}
              >
                <span className="text-xs font-bold">{s.title}</span>
                <HugeiconsIcon icon={FlashIcon} size={14} className="text-amber-500 opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
