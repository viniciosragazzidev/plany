'use client';

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Loading03Icon,
  Download02Icon,
  EyeIcon,
  Layers01Icon,
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
import { toast } from "sonner";
import { importWebMaterials } from "@/lib/actions/bench";
import { MaterialPreviewModal } from "./material-preview-modal";
import { useBench } from "./bench-context";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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

export function WebResearchDialog({
  benchId,
  onSuccess,
}: WebResearchDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  
  const { 
    isGlobalResearching, 
    researchStatus, 
    researchResults, 
    startBackgroundResearch,
    clearResearchResults 
  } = useBench();

  // Map results to the local interface
  const results: WebSource[] = researchResults;

  const handleSearch = async () => {
    await startBackgroundResearch();
  };

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

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger
          render={
            <Button variant="default" className="gap-2 w-full relative group text-secondary">
              <HugeiconsIcon className={cn("text-secondary", isGlobalResearching && "animate-spin")} icon={isGlobalResearching ? Loading03Icon : Search01Icon} size={16} />
              {isGlobalResearching ? "Garimpando..." : "Garimpo Digital"}
              {isGlobalResearching && (
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

        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={Search01Icon} size={20} className="text-primary" />
              Garimpo Digital de Conteúdo
            </DialogTitle>
            <DialogDescription>
              Pesquisamos automaticamente materiais oficiais e acadêmicos baseados no seu contexto.
            </DialogDescription>
          </DialogHeader>

          {results.length === 0 && !isGlobalResearching ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center">
                <HugeiconsIcon icon={Search01Icon} size={32} className="text-primary/40" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-sm">Pronto para garimpar?</p>
                <p className="text-xs text-muted-foreground max-w-[280px]">
                  Clique abaixo para iniciar uma busca cirúrgica baseada nas matérias selecionadas na sua Library.
                </p>
              </div>
              <Button onClick={handleSearch} disabled={isGlobalResearching} className="gap-2 rounded-xl">
                <HugeiconsIcon icon={Search01Icon} size={16} />
                Iniciar Garimpo
              </Button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-4">
                {isGlobalResearching ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 animate-in fade-in zoom-in duration-300">
                    <div className="relative">
                        <HugeiconsIcon icon={Loading03Icon} size={48} className="animate-spin text-primary" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <HugeiconsIcon icon={Search01Icon} size={20} className="text-primary/50" />
                        </div>
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-sm font-bold text-foreground animate-pulse">{researchStatus}</p>
                        <p className="text-xs text-muted-foreground">Você pode fechar este modal e continuar estudando.</p>
                    </div>
                    
                    <div className="w-48 h-1 bg-secondary/30 rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-primary animate-progress-infinite rounded-full" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-3">
                        <HugeiconsIcon icon={Layers01Icon} size={18} className="text-primary" />
                        <div className="flex-1">
                            <p className="text-xs font-bold text-primary uppercase tracking-wider">Garimpo Finalizado</p>
                            <p className="text-[11px] text-muted-foreground">Encontramos {results.length} materiais de alta autoridade.</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={handleSearch} className="h-8 text-xs gap-1.5">
                            <HugeiconsIcon icon={Search01Icon} size={14} />
                            Refazer
                        </Button>
                    </div>

                    <Accordion className="w-full">
                        {Object.entries(groupedByTopic).map(([topic, items]) => (
                        <AccordionItem key={topic} value={topic}>
                            <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 flex-1 text-left">
                                <span className="font-bold text-sm">{topic}</span>
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                {items.length} links
                                </span>
                            </div>
                            </AccordionTrigger>
                            <AccordionContent>
                            <div className="space-y-3">
                                {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-start gap-3 p-3 border rounded-xl border-border/50 bg-secondary/5 hover:bg-secondary/10 transition-colors"
                                >
                                    <Checkbox
                                    checked={selectedIds.has(item.id)}
                                    onCheckedChange={() => toggleSelection(item.id)}
                                    className="mt-1"
                                    />
                                    <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-sm line-clamp-2">
                                        {item.title}
                                    </h4>
                                    <p className="text-[10px] text-muted-foreground truncate mt-1">
                                        {item.sourceUrl}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="secondary" className="text-[10px] h-5 bg-primary/20 text-primary border-none">
                                            ⭐ {item.authorityScore}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground">
                                        {item.markdownLength} palavras
                                        </span>
                                    </div>
                                    </div>
                                    <Button
                                    size="icon-xs"
                                    variant="ghost"
                                    onClick={() => setPreviewId(item.id)}
                                    title="Visualizar"
                                    className="rounded-lg"
                                    >
                                    <HugeiconsIcon icon={EyeIcon} size={14} />
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

              {!isGlobalResearching && (
                <div className="flex gap-2 pt-4 border-t">
                    <Button
                    className="flex-1 gap-2 rounded-xl"
                    onClick={handleImport}
                    disabled={isImporting || selectedIds.size === 0}
                    >
                    {isImporting ? (
                        <>
                        <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin" />
                        Importando...
                        </>
                    ) : (
                        <>
                        <HugeiconsIcon icon={Download02Icon} size={16} />
                        Memorizar Selecionados ({selectedIds.size})
                        </>
                    )}
                    </Button>
                </div>
              )}
            </>
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
