'use client';

import { useState, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Loading03Icon,
  Download02Icon,
  EyeIcon,
  Layers01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { importWebMaterials } from "@/lib/actions/bench";
import { validateGarimpoState, discoverTopicsAction, bulkCreateTopicsAction } from "@/lib/actions/garimpo";
import { MaterialPreviewModal } from "./material-preview-modal";
import { useBench } from "./bench-context";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

interface WebResearchDialogProps {
  benchId: string;
  onSuccess?: () => void;
}

interface WebSource {
  id: string;
  title: string;
  sourceUrl: string;
  topic: string;
  authorityScore: number;
  markdownLength: number;
  markdownContent?: string;
}

type GarimpoStep = "idle" | "validating" | "discovering_topics" | "confirming_topics" | "researching_materials" | "results";

export function WebResearchDialog({
  benchId,
  onSuccess,
}: WebResearchDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Advanced Flow State
  const [step, setStep] = useState<GarimpoStep>("idle");
  const [discoveredTopics, setDiscoveredTopics] = useState<Record<string, string[]>>({});
  const [selectedTopics, setSelectedTopics] = useState<Record<string, string[]>>({});

  const {
    isGlobalResearching,
    researchStatus,
    researchResults,
    startBackgroundResearch,
    clearResearchResults,
    editalItems
  } = useBench();

  // Update step based on global research state
  useEffect(() => {
    if (isGlobalResearching) {
      setStep("researching_materials");
    } else if (step === "researching_materials" && !isGlobalResearching) {
      if (researchResults.length > 0) {
        setStep("results");
      } else {
        setStep("idle");
      }
    }
  }, [isGlobalResearching, researchResults.length, step]);

  const handleStartGarimpo = async () => {
    setStep("validating");
    const validation = await validateGarimpoState(benchId);

    if (!validation.success) {
      toast.error(validation.message);
      setStep("idle");
      return;
    }

    const { scenario } = validation.data;

    if (scenario === "C") {
      toast.error("Para garimpar, adicione pelo menos um assunto à sua matéria selecionada ou importe um edital!");
      setStep("idle");
      return;
    }

    if (scenario === "B") {
      // Scenario B: Topics already exist. Let's group them for selection.
      const grouped: Record<string, string[]> = {};
      editalItems.forEach(item => {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push(item.topic);
      });
      
      setDiscoveredTopics(grouped);
      setSelectedTopics({}); // Start empty to force user to choose up to 3
      setStep("confirming_topics");
      return;
    }

    if (scenario === "A") {
      setStep("discovering_topics");
      const discovery = await discoverTopicsAction(benchId);
      if (discovery.success) {
        setDiscoveredTopics(discovery.data);
        setSelectedTopics({}); // Start empty - user MUST pick up to 3
        setStep("confirming_topics");
        
        toast.info("Identificamos novos tópicos! Escolha até 3 para garimpar materiais.");
      } else {
        toast.error(discovery.message);
        setStep("idle");
      }
    }
  };

  const handleSaveTopicsAndResearch = async () => {
    setIsImporting(true);
    
    // Check if we need to save new topics first (Scenario A)
    const validation = await validateGarimpoState(benchId);
    if (validation.data?.scenario === "A") {
      const res = await bulkCreateTopicsAction(benchId, selectedTopics);
      if (res.success) {
        toast.success(res.message);
        const { newSubjects, newTopics } = res.data || {};
        if (newSubjects && newSubjects.length > 0) {
          queryClient.setQueryData(['bench-subjects', benchId], (old: any) => [...(old || []), ...newSubjects]);
        }
        if (newTopics && newTopics.length > 0) {
          queryClient.setQueryData(['bench-edital-items', benchId], (old: any) => [...(old || []), ...newTopics]);
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['bench-subjects', benchId] }),
          queryClient.invalidateQueries({ queryKey: ['bench-edital-items', benchId] })
        ]);
        router.refresh();
      } else {
        toast.error(res.error || "Erro ao salvar tópicos");
        setIsImporting(false);
        return;
      }
    }

    // Now start material research for the selected topics
    // Format: "Category: Topic"
    const topicsToResearch: string[] = [];
    Object.entries(selectedTopics).forEach(([category, topics]) => {
      topics.forEach(topic => {
        topicsToResearch.push(`${category}: ${topic}`);
      });
    });

    await (startBackgroundResearch as any)(topicsToResearch);
    setIsImporting(false);
  };

  const toggleTopicSelection = (category: string, topic: string) => {
    const newSelected = { ...selectedTopics };
    if (!newSelected[category]) newSelected[category] = [];

    const totalSelected = Object.values(selectedTopics).flat().length;

    if (newSelected[category].includes(topic)) {
      newSelected[category] = newSelected[category].filter(t => t !== topic);
      if (newSelected[category].length === 0) delete newSelected[category];
    } else {
      if (totalSelected >= 3) {
        toast.warning("Você só pode selecionar no máximo 3 assuntos por vez para o garimpo.");
        return;
      }
      newSelected[category] = [...newSelected[category], topic];
    }
    setSelectedTopics(newSelected);
  };

  const totalSelectedTopicsCount = Object.values(selectedTopics).flat().length;

  const results: WebSource[] = researchResults;

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um material");
      return;
    }

    setIsImporting(true);
    toast.info("Importando materiais selecionados...");

    try {
      const response = await importWebMaterials(Array.from(selectedIds));

      if (response.success) {
        toast.success(
          response.message ||
          `${response.importedCount} materiais importados com sucesso!`
        );
        setIsOpen(false);
        setStep("idle");
        setSelectedIds(new Set());
        clearResearchResults();
        router.refresh();
        onSuccess?.();
      } else {
        toast.error(response.error || "Erro ao importar");
      }
    } catch (error) {
      toast.error("Erro ao importar materiais");
      console.error(error);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const groupedByTopic = results.reduce(
    (acc, item) => {
      if (!acc[item.topic]) {
        acc[item.topic] = [];
      }
      acc[item.topic].push(item);
      return acc;
    },
    {} as Record<string, WebSource[]>
  );

  const isBusy = isGlobalResearching || step === "validating" || step === "discovering_topics" || isImporting;
  
  let buttonText = "Garimpo Digital";
  if (isGlobalResearching) buttonText = "Garimpando...";
  else if (step === "validating") buttonText = "Validando...";
  else if (step === "discovering_topics") buttonText = "Mapeando...";
  else if (isImporting) buttonText = "Importando...";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(val) => {
        setIsOpen(val);
        // Only reset to idle if we are completely done or haven't started. 
        // Don't kill background UI state for active tasks!
        if (!val && !isGlobalResearching && step !== "validating" && step !== "discovering_topics" && step !== "confirming_topics" && step !== "researching_materials" && step !== "results") {
           setStep("idle");
        }
      }}>
        <DialogTrigger
          render={
            <Button variant="default" className="gap-2 w-full relative group text-secondary">
              <HugeiconsIcon className={cn("text-secondary", isBusy && "animate-spin")} icon={isBusy ? Loading03Icon : Search01Icon} size={16} />
              {buttonText}
              {isBusy && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full animate-pulse border-2 border-background" />
              )}
              {results.length > 0 && !isGlobalResearching && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground border-2 border-background">
                  {results.length}
                </span>
              )}
            </Button>
          }
        />

        <DialogContent className="sm:max-w-2xl max-h-[85vh] z-500 flex flex-col p-0 overflow-hidden border-none bg-background shadow-2xl">
          <div className="p-6 border-b border-border/50 bg-background">
            <DialogHeader>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-2 py-0 text-[9px] font-black uppercase tracking-widest">
                    Comando Central
                  </Badge>
                  <div className="h-px w-8 bg-border" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground leading-none">
                  Garimpo de <span className="text-primary">Materiais</span>
                </h1>
                <p className="text-muted-foreground text-sm max-w-xl font-medium leading-relaxed">
                  Vamos buscar materiais relevantes para o seu conteúdo!
                </p>
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
            {step === "idle" && (
              <div className="flex flex-col items-center justify-center py-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-[2rem] flex items-center justify-center shadow-inner relative overflow-hidden group">
                  <div className="absolute inset-0 bg-primary/10 animate-pulse group-hover:bg-primary/20 transition-colors" />
                  <HugeiconsIcon icon={Search01Icon} size={40} className="text-primary relative z-10 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="text-center space-y-2 max-w-[320px]">
                  <p className="font-black text-lg tracking-tight">Pronto para garimpar?</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Nossa IA vai vasculhar a web em busca de materiais de alta autoridade (.gov, .edu) focados nos seus assuntos.
                  </p>
                </div>
                <Button onClick={handleStartGarimpo} className="gap-2 h-12 px-8 rounded-2xl  transition-all   ">
                  <HugeiconsIcon icon={Search01Icon} size={18} />
                  Iniciar Garimpo
                </Button>
              </div>
            )}

            {(step === "validating" || step === "discovering_topics" || step === "researching_materials") && (
              <div className="flex flex-col items-center justify-center py-16 gap-8 animate-in fade-in zoom-in duration-500">
                <div className="relative">
                  <div className="absolute inset-[-20px] bg-primary/10 rounded-full animate-ping duration-[3s]" />
                  <div className="relative p-6 bg-background rounded-full shadow-2xl border border-primary/20">
                    <HugeiconsIcon icon={Loading03Icon} size={48} className="animate-spin text-primary" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <HugeiconsIcon icon={Search01Icon} size={20} className="text-primary/50" />
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <p className="text-lg font-black text-foreground tracking-tight">
                    {step === "validating" && "Validando Bancada..."}
                    {step === "discovering_topics" && "Garimpando Conteúdo Programático..."}
                    {step === "researching_materials" && (researchStatus || "Buscando materiais...")}
                  </p>
                  <p className="text-sm text-muted-foreground font-medium max-w-[280px] mx-auto">
                    {step === "discovering_topics" ? "Estou analisando o edital para identificar os tópicos mais importantes." : "Você pode fechar este modal e continuar estudando, te avisaremos quando terminar."}
                  </p>
                </div>

                <div className="w-56 h-1.5 bg-primary/10 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-primary animate-progress-infinite rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                </div>
              </div>
            )}

            {step === "confirming_topics" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center gap-4">
                  <div className="p-2 bg-primary/20 rounded-xl">
                    <HugeiconsIcon icon={Layers01Icon} size={20} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-primary uppercase tracking-widest">Tópicos Identificados</p>
                    <p className="text-[11px] font-medium text-muted-foreground">Selecione os tópicos que deseja salvar e pesquisar.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.entries(discoveredTopics).map(([category, topics]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2">{category}</h4>
                      <Card className="overflow-hidden border-border/50 rounded-2xl bg-secondary/5">
                        <div className="p-2 space-y-1">
                          {topics.map(topic => (
                            <div key={topic} className="flex items-center gap-3 p-2 hover:bg-background/50 rounded-xl transition-colors group">
                              <Checkbox
                                id={topic}
                                checked={selectedTopics[category]?.includes(topic)}
                                onCheckedChange={() => toggleTopicSelection(category, topic)}
                                className="border-primary/30 data-[state=checked]:bg-primary"
                              />
                              <Label htmlFor={topic} className="text-xs font-bold leading-tight flex-1 cursor-pointer group-hover:text-primary transition-colors">{topic}</Label>
                            </div>
                          ))}
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === "results" && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/20 flex items-center gap-4 shadow-sm">
                  <div className="p-2 bg-emerald-500/20 rounded-xl">
                    <HugeiconsIcon icon={Tick01Icon} size={20} className="text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Garimpo Finalizado</p>
                    <p className="text-[11px] font-bold text-emerald-600/70">Encontramos {results.length} materiais de alta autoridade.</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleStartGarimpo} className="h-9 px-4 rounded-xl text-xs font-bold gap-2 hover:bg-emerald-500/10">
                    <HugeiconsIcon icon={Search01Icon} size={14} />
                    Refazer
                  </Button>
                </div>

                <Accordion multiple className="w-full space-y-3">
                  {Object.entries(groupedByTopic).map(([topic, items]) => (
                    <AccordionItem key={topic} value={topic} className="border-none">
                      <AccordionTrigger className="hover:no-underline p-4 rounded-2xl bg-secondary/5 hover:bg-secondary/10 transition-all border border-border/50 group">
                        <div className="flex items-center gap-4 flex-1 text-left">
                          <div className="w-2 h-2 rounded-full bg-primary/40 group-data-[state=open]:bg-primary transition-colors" />
                          <span className="font-black text-sm tracking-tight">{topic}</span>
                          <Badge variant="secondary" className="ml-auto text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border-none px-2.5">
                            {items.length} links
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-3 pb-1 px-1">
                        <div className="space-y-3">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-4 p-4 border rounded-2xl border-border/50 bg-background hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5 group/item"
                            >
                              <Checkbox
                                checked={selectedIds.has(item.id)}
                                onCheckedChange={() => toggleSelection(item.id)}
                                className="mt-1 border-primary/30 data-[state=checked]:bg-primary"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm line-clamp-2 group-hover/item:text-primary transition-colors">
                                  {item.title}
                                </h4>
                                <div className="flex items-center gap-3 mt-3">
                                  <Badge variant="secondary" className="text-[10px] h-6 font-black bg-primary/5 text-primary border-primary/10">
                                    ⭐ {item.authorityScore}
                                  </Badge>
                                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                    {item.markdownLength} Palavras
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setPreviewId(item.id)}
                                className="rounded-xl h-10 w-10 hover:bg-primary/10 hover:text-primary transition-all"
                              >
                                <HugeiconsIcon icon={EyeIcon} size={18} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>

          {(step === "confirming_topics" || step === "results") && (
            <div className="p-6 border-t border-border/50 bg-background/50 backdrop-blur-md">
              <Button
                className={cn(
                  "w-full h-14 rounded-2xl gap-3 font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all hover:-translate-y-1",
                  step === "confirming_topics" ? "bg-primary text-white shadow-primary/20" : "bg-emerald-500 text-white shadow-emerald-500/20"
                )}
                onClick={step === "confirming_topics" ? handleSaveTopicsAndResearch : handleImport}
                disabled={isImporting || (step === "confirming_topics" ? Object.keys(selectedTopics).length === 0 : selectedIds.size === 0)}
              >
                {isImporting ? (
                  <>
                    <HugeiconsIcon icon={Loading03Icon} size={20} className="animate-spin" />
                    {step === "confirming_topics" ? "Salvando Tópicos..." : "Importando Materiais..."}
                  </>
                ) : (
                  <>
                    {step === "confirming_topics" ? (
                      <>
                        <HugeiconsIcon icon={Tick01Icon} size={20} />
                        Salvar e Iniciar Garimpo de Materiais
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={Download02Icon} size={20} />
                        Memorizar Selecionados ({selectedIds.size})
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {previewId && (
        <MaterialPreviewModal
          materialId={previewId}
          onClose={() => setPreviewId(null)}
          results={results}
        />
      )}
    </>
  );
}
