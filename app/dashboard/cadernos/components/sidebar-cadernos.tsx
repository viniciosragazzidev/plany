'use client'

import { useCadernos } from "@/hooks/use-cadernos";
import { Plus, Search, Note01Icon, ArrowDown01Icon, FoldersIcon, FolderIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { createAnotacao } from "@/lib/actions/cadernos";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CreateBenchDialog } from "@/components/onboarding/create-bench-dialog";
import { Label } from "@/components/ui/label";
import { createSubject } from "@/lib/actions/bench";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";

export function SidebarCadernos() {
  const { benches, anotacoes, searchQuery, setSearchQuery, activeAnotacaoId, setActiveAnotacao, addAnotacao } = useCadernos();
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const toggleSubject = (subjectId: string) => {
    setOpenSubjects(prev => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const handleNewNote = useCallback(async (benchId: string, subjectId: string) => {
    // Optimistic UI - Create immediately in state
    const tempId = `temp_${Date.now()}`;
    const newNote = {
      id: tempId,
      benchId,
      subjectId,
      title: "Nova Anotação",
      content: "",
      updatedAt: new Date()
    };
    
    const { addAnotacao, replaceAnotacaoId, deleteAnotacaoLocal, setActiveAnotacao } = useCadernos.getState();
    
    addAnotacao(newNote);
    
    // Open subject folder
    setOpenSubjects(prev => ({ ...prev, [subjectId]: true }));
    setActiveAnotacao(tempId);
    router.push(`/dashboard/cadernos/${tempId}`);

    // Persist
    try {
        const res = await createAnotacao(benchId, subjectId, "Nova Anotação");
        if (res.success && res.anotacao) {
            // Replace temp ID with real ID
            replaceAnotacaoId(tempId, res.anotacao.id);
            // If the user is still on the temp page, redirect to the real one
            if (window.location.pathname.includes(tempId)) {
                router.replace(`/dashboard/cadernos/${res.anotacao.id}`);
            }
        } else {
            throw new Error(res.error || "Erro ao criar anotação");
        }
    } catch (error) {
        // Silent Rollback
        deleteAnotacaoLocal(tempId);
        toast.error("Ops, deu um soluço na rede! Tentei criar a anotação, mas não foi. Tenta de novo?");
        router.push("/dashboard/cadernos");
    }
  }, [router, setActiveAnotacao, addAnotacao]);

  const filteredAnotacoes = anotacoes.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (a.content || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 border-r border-border/50 bg-secondary/5 flex flex-col h-full font-sans">
      <div className="p-4 border-b border-border/50 space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-foreground/80 flex items-center gap-2">
            <HugeiconsIcon icon={Note01Icon} size={18} className="text-primary" />
            Cadernos
            </h2>
            <div className="flex items-center gap-1">
                <CreateBenchDialog 
                    trigger={
                        <Button 
                            variant="ghost" 
                            size="icon-sm" 
                            className="rounded-lg h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            title="Novo Caderno"
                        >
                            <HugeiconsIcon icon={FoldersIcon} size={16} />
                        </Button>
                    }
                />
            </div>
        </div>
        <div className="relative">
          <HugeiconsIcon icon={Search} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar..." 
            className="pl-9 h-8 text-xs rounded-lg bg-background/50 border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-6 pb-20">
          {benches.map(bench => (
            <div key={bench.id} className="space-y-1">
              <div className="flex items-center justify-between px-2 group/bench-header">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate flex-1" title={bench.goalName}>
                  {bench.goalName}
                </h3>
                <AddSidebarSubjectDialog benchId={bench.id} benchName={bench.goalName} />
              </div>
              <div className="space-y-1 mt-2">
                {bench.subjects.map(subject => {
                  const subjectNotes = filteredAnotacoes.filter(a => a.subjectId === subject.id);
                  const isOpen = openSubjects[subject.id];

                  return (
                    <div key={subject.id} className="space-y-1">
                      <div 
                        className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-primary/10 cursor-pointer transition-colors"
                        onClick={() => toggleSubject(subject.id)}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <HugeiconsIcon 
                            icon={ArrowDown01Icon} 
                            size={14} 
                            className={cn("text-muted-foreground transition-transform", !isOpen && "-rotate-90")} 
                          />
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: subject.colorTag }} />
                          <span className="text-xs font-semibold text-foreground/80 truncate">{subject.title}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon-sm" 
                          className="w-5 h-5 opacity-0 group-hover:opacity-100 shrink-0 hover:bg-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNewNote(bench.id, subject.id);
                          }}
                        >
                          <HugeiconsIcon icon={Plus} size={12} className="text-muted-foreground" />
                        </Button>
                      </div>

                      {isOpen && (
                        <div className="pl-6 space-y-0.5">
                          {subjectNotes.length === 0 ? (
                            <div className="px-2 py-1 text-[10px] text-muted-foreground">Vazio</div>
                          ) : (
                            subjectNotes.map(note => (
                              <div
                                key={note.id}
                                onClick={() => {
                                  setActiveAnotacao(note.id);
                                  router.push(`/dashboard/cadernos/${note.id}`);
                                }}
                                className={cn(
                                  "px-2 py-1.5 text-xs rounded-md cursor-pointer truncate transition-colors flex items-center gap-2",
                                  activeAnotacaoId === note.id 
                                    ? "bg-primary/15 text-primary font-medium" 
                                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                                )}
                              >
                                <HugeiconsIcon icon={Note01Icon} size={12} />
                                {note.title}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {/* Toast sutil ao fundo da sidebar: 'Sincronizado com a nuvem' após cada auto-save */}
      <div className="p-3 border-t border-border/50 bg-background/50 flex items-center justify-center">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Sincronizado
        </span>
      </div>
    </div>
  );
}

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"
];

interface AddSidebarSubjectDialogProps {
  benchId: string;
  benchName: string;
}

export function AddSidebarSubjectDialog({ benchId, benchName }: AddSidebarSubjectDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [colorTag, setColorTag] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title) {
      toast.error("Informe o nome da matéria.");
      return;
    }

    setLoading(true);
    try {
      const res = await createSubject({ benchId, title, colorTag });
      if (res.success) {
        if (res.data) {
          // Update local Zustand store
          const { addSubjectLocal } = useCadernos.getState();
          addSubjectLocal(benchId, {
            id: res.data.id,
            benchId,
            title: res.data.title,
            colorTag: res.data.colorTag,
            icon: res.data.icon
          });
          toast.success(`Matéria "${title}" criada com sucesso!`);
          setIsOpen(false);
          setTitle("");
        } else {
          toast.error("Erro inesperado: dados da matéria não retornados.");
        }
      } else {
        toast.error(res.error || "Erro ao criar matéria.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao criar matéria.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon-xs"
        className="w-5 h-5 p-0 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded opacity-0 group-hover/bench-header:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        title="Criar Matéria / Disciplina"
      >
        <HugeiconsIcon icon={Plus} size={10} />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-bold">
              <HugeiconsIcon icon={FolderIcon} size={18} className="text-primary" />
              Nova Matéria para {benchName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adicione uma nova matéria para começar a organizar suas anotações nesta bancada.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="subject-title" className="text-xs font-bold">Nome da Matéria</Label>
              <Input 
                id="subject-title" 
                placeholder="Ex: Direito Administrativo, História..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-xs font-bold">Cor de Destaque</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setColorTag(color)}
                    className={`size-6 rounded-lg border-2 transition-all ${colorTag === color ? "border-primary scale-110 shadow-md" : "border-transparent"}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1 text-xs font-bold rounded-xl" 
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1 gap-2 text-xs font-bold rounded-xl shadow-lg shadow-primary/20" 
              disabled={!title || loading}
              onClick={handleCreate}
            >
              <HugeiconsIcon icon={Tick01Icon} size={14} />
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}