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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { completeOnboarding, createStudyBench } from "@/lib/actions/onboarding";
import { extractBenchDataFromEdital } from "@/lib/actions/bench";
import { garimparFormTopics } from "@/lib/actions/garimpo";
import { searchPublicEditais, selectPublicEdital, getPublicEditalStructure } from "@/lib/actions/public-edital";
import { useThrottledCallback } from "@/hooks/use-throttled-callback";
import { Logo } from "@/components/ui/logo";
import { parseISO, isValid, parse } from "date-fns";
import { 
  FileAttachmentIcon, 
  Loading03Icon, 
  SparklesIcon, 
  Search01Icon, 
  LibraryIcon 
} from "@hugeicons/core-free-icons";
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
  const [isGarimpando, setIsGarimpando] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
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
    publicEditalId: null as string | null,
    // For background indexing
    rawMetadata: null as any,
    fileHash: null as string | null,
  });

  const handleSearch = useThrottledCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await searchPublicEditais(query);
      if (res.success) {
        setSearchResults(res.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  }, 500);

  React.useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  const handleSelectPublic = async (edital: any) => {
    setFormData(prev => ({
      ...prev,
      goalName: edital.contestName || `${edital.institution} - ${edital.role}`,
      examBoard: edital.institution,
      publicEditalId: edital.id
    }));
    setSearchQuery("");
    setSearchResults([]);

    const loadingToast = toast.loading("Importando estrutura do edital...");
    
    try {
      const res = await getPublicEditalStructure(edital.id);
      if (res.success && res.data) {
        setFormData(prev => ({
          ...prev,
          subjects: res.data.subjects.map((s: string) => ({
            title: s,
            priority: 3,
            colorTag: "#3b82f6"
          })),
          editalItems: res.data.editalItems
        }));
        toast.success("Estrutura importada com sucesso!", { id: loadingToast });
        
        // Auto-advance if in onboarding
        if (mode === "onboarding") setStep(3);
      } else {
        toast.error("Erro ao carregar estrutura: " + res.error, { id: loadingToast });
      }
    } catch (err) {
      toast.error("Falha na importação instantânea.", { id: loadingToast });
    }
  };

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
        const { goalName, targetDate, examBoard, subjects, editalItems, examNotice, publicEditalId, rawMetadata, fileHash } = result.data;

        let parsedDate: Date | undefined = undefined;
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
          subjects: subjects.map((s: string) => ({
            title: s,
            priority: 3,
            colorTag: "#3b82f6"
          })),
          editalItems: editalItems || [],
          examNotice: examNotice || "",
          publicEditalId: publicEditalId || null,
          rawMetadata: rawMetadata || null,
          fileHash: fileHash || null
        }));

        toast.success("Edital analisado com sucesso!", {
          description: publicEditalId ? "Encontramos este edital na biblioteca!" : "Mapeamos os tópicos para você."
        });

        if (mode === "onboarding") {
           setStep(3);
        }
      } else {
        toast.error("Erro ao analisar edital: " + result.error);
      }
    } catch (error) {
      toast.error("Falha na extração mágica.");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleGarimpo = async () => {
    if (!formData.goalName) {
      toast.error("Por favor, preencha o Nome do Objetivo antes de garimpar.");
      return;
    }

    setIsGarimpando(true);
    try {
      const result = await garimparFormTopics(formData.goalName, formData.examBoard);

      if (result.success && result.data) {
        const { subjects, editalItems } = result.data;

        // Formatar as matérias com cores aleatórias
        const formattedSubjects = subjects.map((sub: string) => ({
          title: sub,
          priority: 3,
          colorTag: "#" + Math.floor(Math.random() * 16777215).toString(16).padEnd(6, "0"),
        }));

        setFormData(prev => ({
          ...prev,
          subjects: formattedSubjects,
          editalItems: editalItems,
        }));

        toast.success("Matérias e conteúdos garimpados com sucesso!");
        setStep(3); // Avança para o próximo passo onde ele vê as matérias
      } else {
        toast.error(result.message || "Erro ao garimpar matérias.");
      }
    } catch (e: any) {
      toast.error(e.message || "Ocorreu um erro no garimpo");
    } finally {
      setIsGarimpando(false);
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
    setFormData((prev) => {
      const subjectToRemove = prev.subjects[index];
      return {
        ...prev,
        subjects: prev.subjects.filter((_, i) => i !== index),
        editalItems: prev.editalItems.filter(item => item.category !== subjectToRemove?.title),
      };
    });
  };

  const handleSubmit = async () => {
    if (!formData.targetDate) {
      toast.error("Por favor, selecione a data da prova.");
      return;
    }

    setIsPending(true);
    try {
      const payload = {
        ...formData,
        targetDate: formData.targetDate.toISOString(),
        weeklyHours: parseInt(formData.weeklyHours),
        studentLevel: formData.studentLevel,
      };

      if (mode === "onboarding") {
        const result = await completeOnboarding(payload as any);

        if (result?.error) {
          toast.error(result.error);
        } else {
          toast.success("Bem-vindo ao BrainBench AI!");
          onSuccess?.();
        }
      } else {
        const result = await createStudyBench(payload as any);

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
            {/* Phase 1: Global Search */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="size-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-600">
                  <HugeiconsIcon icon={LibraryIcon} size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold">Biblioteca de Editais</h4>
                  <p className="text-xs text-muted-foreground">Busque por concursos já mapeados</p>
                </div>
              </div>
              
              <div className="relative">
                <HugeiconsIcon 
                  icon={Search01Icon} 
                  size={18} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" 
                />
                <Input 
                  placeholder="Pesquisar (ex: PF 2026, INSS, Magistratura...)" 
                  className="pl-11 h-12 rounded-2xl bg-secondary/10 border-border/50 text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isExtracting}
                />
                {isSearching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin text-primary" />
                  </div>
                )}
              </div>

              {searchResults.length > 0 && searchQuery.length >= 3 && (
                <div className="border border-border/50 rounded-2xl overflow-hidden bg-background shadow-xl animate-in fade-in zoom-in-95 duration-200 max-w-[320px] mx-auto w-full">
                  <div className="max-h-60 overflow-y-auto no-scrollbar">
                    {searchResults.map((edital) => (
                      <div 
                        key={edital.id}
                        onClick={() => handleSelectPublic(edital)}
                        className="p-4 hover:bg-primary/5 cursor-pointer border-b border-border/30 last:border-0 flex flex-col gap-1 transition-colors overflow-hidden"
                      >
                        <div className="text-sm font-bold flex items-center justify-between gap-2 overflow-hidden">
                          <span className="truncate flex-1" title={edital.institution}>{edital.institution}</span>
                          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 shrink-0">{edital.year}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground font-medium truncate" title={edital.role}>{edital.role}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">
                <span className="bg-background px-4">ou outras opções</span>
              </div>
            </div>

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
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Manual</span>
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

            {!formData.examNotice && formData.goalName && (
              <div className="flex flex-col items-center p-6 bg-primary/5 border border-primary/20 rounded-xl mt-2 text-center gap-3 animate-in fade-in zoom-in duration-300">
                <HugeiconsIcon icon={SparklesIcon} className="size-8 text-primary" />
                <div className="space-y-1">
                  <h3 className="font-medium text-lg">Garimpar Matérias via IA</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Não tem o edital em PDF? Deixe a IA analisar a web e descobrir o conteúdo programático para o seu objetivo.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleGarimpo}
                  disabled={isGarimpando}
                  className="w-full sm:w-auto mt-2"
                >
                  {isGarimpando ? (
                    <><HugeiconsIcon icon={Loading03Icon} className="mr-2 size-4 animate-spin" /> Descobrindo Conteúdo...</>
                  ) : (
                    <><HugeiconsIcon icon={SparklesIcon} className="mr-2 size-4" /> Garimpar Agora</>
                  )}
                </Button>
              </div>
            )}
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

            <div className="flex flex-col gap-2 min-h-[100px]">
              {formData.subjects.length === 0 && (
                <p className="text-sm text-muted-foreground text-center w-full py-8">
                  Nenhuma disciplina adicionada ainda.
                </p>
              )}
              
              {formData.editalItems.length > 0 ? (
                <Accordion className="w-full">
                  {formData.subjects.map((s, i) => {
                    const items = formData.editalItems.filter(item => item.category === s.title);
                    return (
                      <AccordionItem key={i} value={s.title} className="border-b-0 mb-2 border rounded-lg px-4 data-[state=open]:bg-muted/30">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <div className="size-3 rounded-full shrink-0" style={{ backgroundColor: s.colorTag }} />
                            <span className="font-medium text-left">{s.title}</span>
                            <Badge variant="secondary" className="ml-2 font-normal text-xs shrink-0">
                              {items.length} tópicos
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-6 pb-2">
                            <ul className="space-y-2 text-sm text-muted-foreground border-l-2 pl-4 ml-1">
                              {items.length > 0 ? items.map((item, idx) => (
                                <li key={idx} className="list-item">
                                  <span className="font-medium text-foreground/80">{item.topic}</span>
                                  {item.description && (
                                    <p className="text-xs mt-0.5 opacity-80">{item.description}</p>
                                  )}
                                </li>
                              )) : (
                                <li>Sem tópicos detalhados.</li>
                              )}
                            </ul>
                            <div className="mt-4 flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeSubject(i);
                                }}
                              >
                                <HugeiconsIcon icon={Delete02Icon} className="size-4 mr-1.5" />
                                Remover Disciplina
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              ) : (
                <div className="flex flex-wrap gap-2 items-start content-start">
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
              )}
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
