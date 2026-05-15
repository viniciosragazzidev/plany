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
  Plus,
  ArrowLeft01Icon,
  Tick01Icon,
  Book01Icon,
  SparklesIcon
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { differenceInDays } from "date-fns";
import { WebResearchDialog } from "./web-research-dialog";
import { ImportEditalDialog } from "@/components/onboarding/import-edital-dialog";
import { MotivationalWidget } from "@/components/ui/motivational-widget";
import { useBench } from "./bench-context";
import { useState, useEffect } from "react";
import { getQuizzesAction, generateQuizAction } from "@/lib/actions/quiz";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { QuizActiveState } from "./quiz-active-state";
import { FlashcardsTool } from "./flashcards-tool";

interface IntelligenceToolsProps {
  targetDate: string;
  weeklyHours: number;
  benchId: string;
  editalItems?: { id: string; category: string; topic: string; isCovered: boolean }[];
  subjects?: { id: string; title: string }[];
  onMaterialsImported?: () => void;
}

export function IntelligenceTools({ targetDate, weeklyHours, benchId, editalItems = [], subjects = [], onMaterialsImported }: IntelligenceToolsProps) {
  const { 
    sidebarState, 
    setSidebarState, 
    activeQuizId, 
    setActiveQuizId, 
    isGeneratingQuiz, 
    setIsGeneratingQuiz,
    isGeneratingFlashcards,
    isEditalConsultantMode,
    setIsEditalConsultantMode
  } = useBench();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  
  const [selectedEditalItems, setSelectedEditalItems] = useState<string[]>([]);

  const daysLeft = differenceInDays(new Date(targetDate), new Date());
  const totalCount = editalItems.length;
  const coveredCount = editalItems.filter(item => item.isCovered).length;
  const coveragePercent = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const fetch = async () => {
      if (sidebarState === 'quiz_list') {
        console.log(`[IntelligenceTools] Triggering load for bench: ${benchId}`);
        await loadQuizzes();
      }
    };

    fetch();

    if (isGeneratingQuiz && sidebarState === 'quiz_list') {
      interval = setInterval(fetch, 4000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sidebarState, benchId, isGeneratingQuiz]);

  const loadQuizzes = async () => {
    if (isLoadingQuizzes) return;
    setIsLoadingQuizzes(true);
    try {
      const res = await getQuizzesAction(benchId);
      if (res.success && res.quizzes) {
        console.log(`[IntelligenceTools] Successfully loaded ${res.quizzes.length} quizzes`);
        setQuizzes(res.quizzes);
      }
    } catch (e) {
      console.error("[IntelligenceTools] Failed to load quizzes:", e);
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (selectedEditalItems.length === 0) {
      toast.error("Selecione pelo menos um assunto.");
      return;
    }

    // Identify subjectId from selected edital items
    const firstItemId = selectedEditalItems[0];
    const firstItem = editalItems.find(item => item.id === firstItemId);
    
    if (!firstItem) return;

    const matchedSubject = subjects.find(s => 
      s.title.toLowerCase() === firstItem.category.toLowerCase() ||
      firstItem.category.toLowerCase().includes(s.title.toLowerCase())
    );

    const subjectId = matchedSubject?.id || (subjects.length > 0 ? subjects[0].id : null);

    if (!subjectId) {
      toast.error("Nenhuma matéria encontrada vinculada a este assunto.");
      return;
    }

    setIsGeneratingQuiz(true);
    setSidebarState('quiz_list'); // Voltar para a lista imediatamente para feedback visual
    toast.info("Gerando seu quiz personalizado... 🧠");
    
    try {
      const res = await generateQuizAction(benchId, subjectId, selectedEditalItems);
      
      if (res.success) {
        toast.success("Quiz gerado com sucesso!");
        setSelectedEditalItems([]);
        await loadQuizzes();
      } else {
        toast.error(res.error || "Erro ao gerar quiz");
      }
    } catch (error) {
      toast.error("Ocorreu um erro ao gerar o quiz.");
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  // Group edital items by category
  const categories = Array.from(new Set(editalItems.map(item => item.category)));

  if (sidebarState === 'active_quiz' && activeQuizId) {
    return <QuizActiveState quizId={activeQuizId} onBack={() => setSidebarState('quiz_list')} />;
  }

  if (sidebarState === 'flashcard_list' || sidebarState === 'flashcard_study' || sidebarState === 'flashcard_config') {
    return <FlashcardsTool benchId={benchId} subjects={subjects as any} />;
  }

  if (sidebarState === 'quiz_list') {
    return (
      <div className="flex flex-col h-full bg-secondary/5 border-l border-border/50 w-80 shrink-0 font-sans animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-border/50 flex items-center gap-3 bg-background/50">
          <Button variant="ghost" size="icon-sm" onClick={() => setSidebarState('default')} className="rounded-xl h-8 w-8">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </Button>
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
            <HugeiconsIcon icon={Quiz01Icon} size={18} className="text-primary" />
            Meus Simulados
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          <Button 
            onClick={() => setSidebarState('quiz_config')} 
            className="w-full h-12 rounded-2xl gap-2 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/10"
            disabled={isGeneratingQuiz || isLoadingQuizzes}
          >
            {isGeneratingQuiz || isLoadingQuizzes ? (
              <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              <HugeiconsIcon icon={Plus} size={16} />
            )}
            {isGeneratingQuiz ? "Gerando..." : isLoadingQuizzes ? "Carregando..." : "Novo Simulado"}
          </Button>

          {isLoadingQuizzes ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 w-full bg-secondary/10 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : quizzes.length > 0 ? (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <Card 
                  key={quiz.id} 
                  className="p-4 rounded-2xl border-border/50 hover:border-primary/50 transition-all cursor-pointer group bg-background"
                  onClick={() => {
                    setActiveQuizId(quiz.id);
                    setSidebarState('active_quiz');
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                      {quiz.subject?.title || "Geral"}
                    </span>
                    {quiz.score !== null && (
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        quiz.score >= 70 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                      )}>
                        {quiz.score}%
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                    {quiz.title}
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {new Date(quiz.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-6">
              <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-muted-foreground mx-auto mb-4 opacity-50">
                <HugeiconsIcon icon={Quiz01Icon} size={24} />
              </div>
              <p className="text-xs text-muted-foreground italic">Nenhum simulado gerado ainda. Vamos começar?</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (sidebarState === 'quiz_config') {
    return (
      <div className="flex flex-col h-full bg-secondary/5 border-l border-border/50 w-80 shrink-0 font-sans animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-border/50 flex items-center gap-3 bg-background/50">
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={() => setSidebarState('quiz_list')} 
            className="rounded-xl h-8 w-8"
            disabled={isGeneratingQuiz}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </Button>
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
            <HugeiconsIcon icon={Settings01Icon} size={18} className="text-primary" />
            Configurar Quiz
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Selecione os Assuntos</p>
            
            {categories.map((category) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-1.5 h-4 bg-primary rounded-full" />
                   <h5 className="text-xs font-bold text-foreground">{category}</h5>
                </div>
                <div className="pl-3 space-y-2 border-l border-border/50 ml-0.5">
                  {editalItems
                    .filter(item => item.category === category)
                    .map(item => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={item.id} 
                          checked={selectedEditalItems.includes(item.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEditalItems(prev => [...prev, item.id]);
                              // Set subjectId from category mapping if needed
                              // For simplicity, we'll try to find a subject that matches the category
                              // In a real app, this mapping should be more robust
                            } else {
                              setSelectedEditalItems(prev => prev.filter(id => id !== item.id));
                            }
                          }}
                          disabled={isGeneratingQuiz}
                        />
                        <Label 
                          htmlFor={item.id}
                          className="text-[11px] leading-tight cursor-pointer font-medium text-muted-foreground hover:text-foreground transition-colors truncate max-w-[calc(100%-2rem)]"
                          title={item.topic}
                        >
                          {item.topic}
                        </Label>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-border/50 bg-background/50">
          <Button 
            className="w-full h-12 rounded-2xl gap-2 font-bold uppercase text-xs shadow-lg shadow-primary/10"
            onClick={handleGenerateQuiz}
            disabled={isGeneratingQuiz || selectedEditalItems.length === 0}
          >
            {isGeneratingQuiz ? (
              <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              <HugeiconsIcon icon={SparklesIcon} size={18} />
            )}
            Gerar 10 Questões
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-3 italic opacity-60">
            A IA usará seus materiais como base.
          </p>
        </div>
      </div>
    );
  }

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
              <div className="space-y-3">
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
                </div>

                <Button 
                  variant={isEditalConsultantMode ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "w-full h-9 rounded-xl gap-2 text-[10px] font-bold uppercase transition-all duration-300",
                    isEditalConsultantMode ? "bg-primary shadow-lg shadow-primary/20" : "hover:border-primary/50"
                  )}
                  onClick={() => setIsEditalConsultantMode(!isEditalConsultantMode)}
                >
                  <HugeiconsIcon icon={BrainIcon} size={14} />
                  {isEditalConsultantMode ? "Modo Consultor: Ativo" : "Ativar Consultor de Edital"}
                </Button>
                
                {isEditalConsultantMode && (
                  <p className="text-[9px] text-primary font-medium italic text-center animate-pulse">
                    Chat focado apenas no seu edital.
                  </p>
                )}

                <p className="text-[10px] text-muted-foreground italic text-center">
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
            <Button 
              variant="outline" 
              className={cn(
                "h-auto py-4 flex-col gap-2 rounded-2xl bg-background border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5",
                isGeneratingQuiz && "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5"
              )}
              onClick={() => setSidebarState('quiz_list')}
            >
              {isGeneratingQuiz ? (
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <HugeiconsIcon icon={Quiz01Icon} size={20} className="text-primary" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-tight">
                {isGeneratingQuiz ? "Gerando..." : "Simulados"}
              </span>
            </Button>
            <Button 
              variant="outline" 
              className={cn(
                "h-auto py-4 flex-col gap-2 rounded-2xl bg-background border-border/50 hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/5",
                isGeneratingFlashcards && "border-amber-500/50 bg-amber-500/5 shadow-lg shadow-amber-500/5"
              )}
              onClick={() => setSidebarState('flashcard_list')}
            >
              {isGeneratingFlashcards ? (
                <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              ) : (
                <HugeiconsIcon icon={FlashIcon} size={20} className="text-amber-500" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-tight">
                {isGeneratingFlashcards ? "Gerando..." : "Flashcards"}
              </span>
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
