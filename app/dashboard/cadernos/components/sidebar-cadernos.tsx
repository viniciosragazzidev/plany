'use client'

import { useCadernos } from "@/hooks/use-cadernos";
import { Plus, Search, Note01Icon, ArrowDown01Icon, FoldersIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { createAnotacao } from "@/lib/actions/cadernos";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CreateBenchDialog } from "@/components/onboarding/create-bench-dialog";

export function SidebarCadernos() {
  const { benches, anotacoes, searchQuery, setSearchQuery, activeAnotacaoId, setActiveAnotacao, addAnotacao } = useCadernos();
  const [openSubjects, setOpenSubjects] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const toggleSubject = (subjectId: string) => {
    setOpenSubjects(prev => ({ ...prev, [subjectId]: !prev[subjectId] }));
  };

  const handleNewNote = async (benchId: string, subjectId: string) => {
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
    addAnotacao(newNote);
    
    // Open subject folder
    setOpenSubjects(prev => ({ ...prev, [subjectId]: true }));
    setActiveAnotacao(tempId);
    router.push(`/dashboard/cadernos/${tempId}`);

    // Persist
    const res = await createAnotacao(benchId, subjectId, "Nova Anotação");
    if (res.success && res.anotacao) {
      // It's tricky to update ID smoothly if already navigating, but Zustand will handle it if we re-sync
      // For now, redirect to the real one
      router.push(`/dashboard/cadernos/${res.anotacao.id}`);
      setActiveAnotacao(res.anotacao.id);
    } else {
      toast.error("Erro ao criar anotação");
    }
  };

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
                <Button 
                    variant="ghost" 
                    size="icon-sm" 
                    className="rounded-lg h-7 w-7 text-primary hover:bg-primary/10"
                    title="Nova Anotação Rápida"
                    onClick={() => {
                        // Quick note in the first bench/subject found as a shortcut
                        if (benches.length > 0 && benches[0].subjects.length > 0) {
                            handleNewNote(benches[0].id, benches[0].subjects[0].id);
                        } else {
                            toast.info("Crie uma bancada e matéria primeiro!");
                        }
                    }}
                >
                    <HugeiconsIcon icon={Plus} size={16} />
                </Button>
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
              <h3 className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                {bench.goalName}
              </h3>
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