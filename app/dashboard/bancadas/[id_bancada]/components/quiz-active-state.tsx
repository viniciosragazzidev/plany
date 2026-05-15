'use client'

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  ArrowLeft01Icon, 
  Tick01Icon, 
  Cancel01Icon,
  AiChat01Icon,
  Clock01Icon,
  InformationCircleIcon
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getQuizDetailsAction, submitQuizAnswerAction, finishQuizAction } from "@/lib/actions/quiz";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

import { useBench } from "./bench-context";

interface QuizActiveStateProps {
  quizId: string;
  onBack: () => void;
}

export function QuizActiveState({ quizId, onBack }: QuizActiveStateProps) {
  const { setExternalMessage } = useBench();
  const [quiz, setQuiz] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [confidenceLevel, setConfidenceLevel] = useState<"certo" | "duvidoso" | "chutando" | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    const res = await getQuizDetailsAction(quizId);
    if (res.success) {
      setQuiz(res.quiz);
    } else {
      toast.error("Erro ao carregar simulado");
      onBack();
    }
  };

  const handleAnswer = async () => {
    if (!selectedOptionId || !confidenceLevel) return;

    setIsSubmitting(true);
    const question = quiz.questions[currentQuestionIndex];
    const res = await submitQuizAnswerAction({
      quizId,
      questionId: question.id,
      selectedOptionId,
      confidenceLevel
    });

    if (res.success) {
      setIsAnswered(true);
    } else {
      toast.error("Erro ao salvar resposta");
    }
    setIsSubmitting(false);
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOptionId(null);
      setConfidenceLevel(null);
      setIsAnswered(false);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    const res = await finishQuizAction(quizId);
    if (res.success) {
      setScore(res.score);
      setIsFinished(true);
    } else {
      toast.error("Erro ao finalizar simulado");
    }
  };

  if (!quiz) {
    return (
      <div className="flex flex-col h-full bg-secondary/5 border-l border-border/50 w-80 shrink-0 items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex flex-col h-full bg-secondary/5 border-l border-border/50 w-80 shrink-0 font-sans animate-in zoom-in duration-300">
        <div className="p-6 border-b border-border/50 flex items-center gap-3 bg-background/50">
          <Button variant="ghost" size="icon-sm" onClick={onBack} className="rounded-xl h-8 w-8">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          </Button>
          <div className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
            Resultado Final
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="relative">
            <div className={cn(
              "w-32 h-32 rounded-full border-4 flex items-center justify-center text-3xl font-bold shadow-xl",
              (score || 0) >= 70 ? "border-emerald-500 text-emerald-500 shadow-emerald-500/20" : "border-amber-500 text-amber-500 shadow-amber-500/20"
            )}>
              {score}%
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-bold">Simulado Concluído!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {(score || 0) >= 70 
                ? "Excelente desempenho! Você está dominando o conteúdo." 
                : "Bom esforço! Continue revisando os pontos fracos."}
            </p>
          </div>

          <Button onClick={onBack} className="w-full h-12 rounded-2xl font-bold uppercase text-[10px] tracking-widest">
            Voltar para a Lista
          </Button>
        </div>
      </div>
    );
  }

  const question = quiz.questions[currentQuestionIndex];

  return (
    <div className="flex flex-col h-full bg-secondary/5 border-l border-border/50 w-80 shrink-0 font-sans animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between bg-background/50 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-xs" onClick={onBack} className="rounded-lg h-7 w-7">
            <HugeiconsIcon icon={ArrowLeft01Icon} size={14} />
          </Button>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Questão {currentQuestionIndex + 1}/{quiz.questions.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
          <HugeiconsIcon icon={Clock01Icon} size={14} />
          <span>Simulado Ativo</span>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed font-medium">
          <ReactMarkdown>{question.content}</ReactMarkdown>
        </div>

        <div className="space-y-3">
          {question.options.map((option: any, idx: number) => {
            const letters = ['A', 'B', 'C', 'D', 'E'];
            const isSelected = selectedOptionId === option.id;
            const isCorrect = option.isCorrect;
            
            let statusClasses = "border-border/50 bg-background";
            if (isSelected) statusClasses = "border-primary bg-primary/5 ring-1 ring-primary/20";
            if (isAnswered) {
               if (isCorrect) statusClasses = "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20";
               else if (isSelected) statusClasses = "border-red-500 bg-red-500/10 ring-1 ring-red-500/20";
            }

            return (
              <button
                key={option.id}
                disabled={isAnswered}
                onClick={() => setSelectedOptionId(option.id)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border-2 transition-all flex gap-3 group",
                  statusClasses
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary",
                  isAnswered && isCorrect ? "bg-emerald-500 text-white" : "",
                  isAnswered && isSelected && !isCorrect ? "bg-red-500 text-white" : ""
                )}>
                  {letters[idx]}
                </div>
                <div className="text-xs font-medium leading-normal">{option.content}</div>
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-wider">
                <HugeiconsIcon icon={InformationCircleIcon} size={14} />
                Explicação
             </div>
             <p className="text-[11px] leading-relaxed text-muted-foreground italic">
                {question.explanation}
             </p>
             <Button 
                variant="outline" 
                size="xs" 
                className="w-full rounded-xl gap-2 h-8 text-[10px] font-bold uppercase tracking-tight"
                onClick={() => {
                  setExternalMessage(`Sobre a questão: "${question.content.substring(0, 100)}...", tenho uma dúvida. A explicação diz: "${question.explanation.substring(0, 100)}...". Pode me explicar melhor?`);
                  toast.success("Dúvida enviada para o chat! 💬");
                }}
             >
                <HugeiconsIcon icon={AiChat01Icon} size={14} className="text-primary" />
                Dúvida? Perguntar ao Tutor
             </Button>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="p-5 border-t border-border/50 bg-background/50">
        {!isAnswered ? (
          <div className="space-y-4">
             <div className="flex justify-between gap-2">
                {['certo', 'duvidoso', 'chutando'].map((level) => (
                   <button
                    key={level}
                    onClick={() => setConfidenceLevel(level as any)}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-[9px] font-bold uppercase tracking-tighter border transition-all",
                      confidenceLevel === level 
                        ? "bg-primary/10 border-primary text-primary shadow-sm" 
                        : "bg-background border-border/50 text-muted-foreground hover:bg-secondary/50"
                    )}
                   >
                     {level}
                   </button>
                ))}
             </div>
             <Button 
                className="w-full h-12 rounded-2xl font-bold uppercase text-xs shadow-lg shadow-primary/10"
                disabled={!selectedOptionId || !confidenceLevel || isSubmitting}
                onClick={handleAnswer}
             >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  "Confirmar Resposta"
                )}
             </Button>
          </div>
        ) : (
          <Button 
            className="w-full h-12 rounded-2xl font-bold uppercase text-xs shadow-lg shadow-primary/10"
            onClick={handleNext}
          >
            {currentQuestionIndex < quiz.questions.length - 1 ? "Próxima Questão" : "Ver Resultado"}
          </Button>
        )}
      </div>
    </div>
  );
}
