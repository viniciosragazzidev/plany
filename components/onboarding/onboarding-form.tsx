"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle,
  Plus,
  Delete02Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Trophy,
  Clock01Icon,
  User,
  Calendar01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { completeOnboarding, createStudyBench } from "@/lib/actions/onboarding";
import { extractBenchDataFromEdital } from "@/lib/actions/bench";
import { Logo } from "@/components/ui/logo";
import { parseISO, isValid, parse } from "date-fns";
import { FileAttachmentIcon, Loading03Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import { useCadernos } from "@/hooks/use-cadernos";

type Step = 1 | 2 | 3;

interface OnboardingFormProps {
  mode?: "onboarding" | "bench-only";
  onSuccess?: () => void;
}

export default function OnboardingForm({ mode = "onboarding", onSuccess }: OnboardingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(mode === "onboarding" ? 1 : 2);
  const [isPending, setIsPending] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const addBenchLocal = useCadernos((state) => state.addBenchLocal);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    studentLevel: "" as any,
    mainPainPoint: "",
    goalName: "",
    examBoard: "",
    targetDate: undefined as Date | undefined,
    weeklyHours: "20",
    subjects: [] as { title: string; priority: number; colorTag: string }[],
    editalItems: [] as { category: string; topic: string; description?: string; weight?: number }[],
    examNotice: "",
  });

  const handleMagicImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      toast.error("Por favor, selecione um arquivo PDF.");
      return;
    }

    setIsExtracting(true);
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const result = await extractBenchDataFromEdital(formDataUpload);
      if (result.success && result.data) {
        const { goalName, targetDate, examBoard, weeklyHours, subjects, editalItems, examNotice } = result.data;
        
        let parsedDate = undefined;
        if (targetDate) {
          // Tenta vários formatos
          const formats = ["yyyy-MM-dd", "dd/MM/yyyy", "dd-MM-yyyy"];
          for (const fmt of formats) {
            const date = parse(targetDate, fmt, new Date());
            if (isValid(date)) {
              parsedDate = date;
              break;
            }
          }
          
          if (!parsedDate) {
            const date = parseISO(targetDate);
            if (isValid(date)) parsedDate = date;
          }
        }

        setFormData(prev => ({
          ...prev,
          goalName: goalName || prev.goalName,
          examBoard: examBoard || prev.examBoard,
          targetDate: parsedDate || prev.targetDate,
          weeklyHours: weeklyHours?.toString() || prev.weeklyHours,
          subjects: [
            ...prev.subjects,
            ...(subjects || []).map((s: string) => ({ title: s, priority: 3, colorTag: "#3b82f6" }))
          ],
          editalItems: editalItems || [],
          examNotice: examNotice || ""
        }));

        toast.success("Dados extraídos com sucesso!", {
          description: "Revisamos o edital e preenchemos os campos para você."
        });
      } else {
        throw new Error(result.error || "Falha na extração");
      }
    } catch (error: any) {
      toast.error("Erro ao processar edital: " + error.message);
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Subjects Input State
  const [newSubject, setNewSubject] = useState({ title: "", priority: 3, colorTag: "#3b82f6" });

  const nextStep = () => setStep((s) => (s + 1) as Step);
  const prevStep = () => setStep((s) => (s - 1) as Step);

  const addSubject = () => {
    if (!newSubject.title) return;
    setFormData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, { ...newSubject }],
    }));
    setNewSubject({ title: "", priority: 3, colorTag: "#3b82f6" });
  };

  const removeSubject = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.targetDate) {
      toast.error("Por favor, selecione a data da prova.");
      return;
    }

    setIsPending(true);
    try {
      if (mode === "onboarding") {
        const result = await completeOnboarding({
          ...formData,
          targetDate: formData.targetDate.toISOString(),
          weeklyHours: parseInt(formData.weeklyHours),
          studentLevel: formData.studentLevel,
        });

        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Bem-vindo ao BrainBench AI!");
          onSuccess?.();
        }
      } else {
        const result = await createStudyBench({
          goalName: formData.goalName,
          targetDate: formData.targetDate.toISOString(),
          weeklyHours: parseInt(formData.weeklyHours),
          subjects: formData.subjects,
          editalItems: formData.editalItems,
          examBoard: formData.examBoard,
          examNotice: formData.examNotice,
        });

        if (result?.error) {
          toast.error(result.error);
        } else if (result.success && result.data) {
          // Update local state for instant feedback
          addBenchLocal({
            id: result.data.bench.id,
            goalName: result.data.bench.goalName,
            subjects: result.data.subjects,
          });

          toast.success("Nova bancada criada com sucesso!");
          onSuccess?.();
          router.refresh();
        }
      }
    } catch (error) {
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto">
        <CardHeader className="text-center px-0">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <CardTitle className="text-2xl font-bold">
            {mode === "onboarding" ? "Configuração Inicial" : "Nova Bancada de Estudo"}
          </CardTitle>
          <CardDescription className="text-base">
            {mode === "onboarding" 
              ? "Vamos configurar seu copiloto de estudos personalizado."
              : "Preencha os dados para criar seu novo objetivo de estudos."}
          </CardDescription>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {(mode === "onboarding" ? [1, 2, 3] : [2, 3]).map((i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  step === i ? "w-8 bg-primary" : "w-2 bg-primary/20"
                )}
              />
            ))}
          </div>
        </CardHeader>

        <div className="py-4">
          {step === 1 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Como podemos te chamar?</Label>
                <div className="relative">
                  <HugeiconsIcon icon={User} className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    className="pl-10"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Qual seu nível atual?</Label>
                <Select
                  value={formData.studentLevel}
                  onValueChange={(val) => setFormData({ ...formData, studentLevel: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concurseiro">Concurseiro</SelectItem>
                    <SelectItem value="universitario">Universitário</SelectItem>
                    <SelectItem value="vestibulando">Vestibulando</SelectItem>
                    <SelectItem value="profissional">Profissional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="pain-point">Qual seu maior desafio hoje?</Label>
                <Input
                  id="pain-point"
                  placeholder="Ex: Falta de tempo, ansiedade, base fraca..."
                  value={formData.mainPainPoint}
                  onChange={(e) => setFormData({ ...formData, mainPainPoint: e.target.value })}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Magic Import Section */}
              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                    <HugeiconsIcon icon={SparklesIcon} size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Importação Mágica</h4>
                    <p className="text-xs text-muted-foreground">Preencha tudo automaticamente via PDF</p>
                  </div>
                </div>

                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="application/pdf"
                  onChange={handleMagicImport}
                />
                
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full bg-background hover:bg-primary/5 border-primary/20 gap-2 h-12 rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <>
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin size-4" />
                      Analisando Edital...
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={FileAttachmentIcon} className="size-4 text-primary" />
                      Selecionar Edital PDF
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-4">
                <Separator className="flex-1" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ou preencha manualmente</span>
                <Separator className="flex-1" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="goal">Qual seu grande objetivo?</Label>
                  <div className="relative">
                    <HugeiconsIcon icon={Trophy} className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      id="goal"
                      placeholder="Ex: Magistratura 2026, ENEM..."
                      className="pl-10"
                      value={formData.goalName}
                      onChange={(e) => setFormData({ ...formData, goalName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="board">Banca Examinadora</Label>
                  <Input
                    id="board"
                    placeholder="Ex: FGV, Cebraspe..."
                    value={formData.examBoard}
                    onChange={(e) => setFormData({ ...formData, examBoard: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Data da Prova/Objetivo</Label>
                  <Popover>
                    <PopoverTrigger render={
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !formData.targetDate && "text-muted-foreground"
                        )}
                      >
                        <HugeiconsIcon icon={Calendar01Icon} className="mr-2 size-4" />
                        {formData.targetDate ? (
                          format(formData.targetDate, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                      </Button>
                    } />
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.targetDate}
                        onSelect={(date) => setFormData({ ...formData, targetDate: date })}
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="hours">Horas semanais disponíveis</Label>
                  <div className="relative">
                    <HugeiconsIcon icon={Clock01Icon} className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <Input
                      id="hours"
                      type="number"
                      className="pl-10"
                      value={formData.weeklyHours}
                      onChange={(e) => setFormData({ ...formData, weeklyHours: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col gap-4 bg-muted/50 p-4 rounded-xl">
                <Label>O que você precisa estudar? (Disciplinas)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nome da disciplina"
                    value={newSubject.title}
                    onChange={(e) => setNewSubject({ ...newSubject, title: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addSubject()}
                  />
                  <Button type="button" size="icon" onClick={addSubject} className="shrink-0">
                    <HugeiconsIcon icon={Plus} className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 min-h-[100px] items-start content-start">
                {formData.subjects.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center w-full py-8">
                    Nenhuma disciplina adicionada ainda.
                  </p>
                )}
                {formData.subjects.map((s, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="flex items-center gap-2 py-1.5 px-3 rounded-lg border"
                    style={{ borderColor: s.colorTag + '40' }}
                  >
                    <div className="size-2 rounded-full" style={{ backgroundColor: s.colorTag }} />
                    <span className="font-medium">{s.title}</span>
                    <button
                      onClick={() => removeSubject(i)}
                      className="hover:text-destructive transition-colors"
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              
              <Separator />
              
              <div className="text-sm text-muted-foreground bg-primary/5 p-4 rounded-lg border border-primary/10">
                💡 <strong>Dica:</strong> A IA organizará seu cronograma inicial com base nessas informações.
              </div>
            </div>
          )}
        </div>

        <CardFooter className="flex justify-between gap-4 border-t pt-6 px-0 mt-4">
          {step > (mode === "onboarding" ? 1 : 2) ? (
            <Button variant="ghost" onClick={prevStep} disabled={isPending}>
              <HugeiconsIcon icon={ArrowLeft01Icon} className="mr-2 size-4" />
              Anterior
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button 
                onClick={nextStep} 
                disabled={step === 1 && (!formData.name || !formData.studentLevel)}
                className="bg-primary hover:bg-primary/90"
            >
              Continuar
              <HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 size-4" />
            </Button>
          ) : (
            <Button 
                onClick={handleSubmit} 
                disabled={isPending || formData.subjects.length === 0}
                className="bg-primary hover:bg-primary/90"
            >
              {isPending ? "Configurando..." : "Finalizar Configuração"}
              <HugeiconsIcon icon={CheckCircle} className="ml-2 size-4" />
            </Button>
          )}
        </CardFooter>
    </div>
  );
}
