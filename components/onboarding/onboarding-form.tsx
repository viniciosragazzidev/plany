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
import { Logo } from "@/components/ui/logo";

type Step = 1 | 2 | 3;

interface OnboardingFormProps {
  mode?: "onboarding" | "bench-only";
  onSuccess?: () => void;
}

export default function OnboardingForm({ mode = "onboarding", onSuccess }: OnboardingFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(mode === "onboarding" ? 1 : 2);
  const [isPending, setIsPending] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    studentLevel: "" as any,
    mainPainPoint: "",
    goalName: "",
    targetDate: undefined as Date | undefined,
    weeklyHours: "20",
    subjects: [] as { title: string; priority: number; colorTag: string }[],
  });

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
        });

        if (result?.error) {
          toast.error(result.error);
        } else {
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="goal">Qual seu grande objetivo?</Label>
                <div className="relative">
                  <HugeiconsIcon icon={Trophy} className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input
                    id="goal"
                    placeholder="Ex: Magistratura 2026, ENEM, OAB..."
                    className="pl-10"
                    value={formData.goalName}
                    onChange={(e) => setFormData({ ...formData, goalName: e.target.value })}
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
