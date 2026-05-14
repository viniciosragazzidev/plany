'use client'

import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Plus, 
  Search01Icon, 
  Book02Icon, 
  MoreHorizontalIcon, 
  PencilIcon, 
  Delete02Icon, 
  PinIcon, 
  PinOffIcon,
  Tag01Icon,
  Folder02Icon,
  Layers01Icon,
  FilterIcon,
  Loading03Icon
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AddMaterialDialog } from "./add-material-dialog";
import { SubjectManager } from "./subject-manager";
import { AddTopicDialog } from "./add-topic-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBench } from "./bench-context";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { CoverageRing } from "@/components/ui/coverage-ring";
import { Tick01Icon } from "@hugeicons/core-free-icons";

import { useBenchData } from "@/hooks/use-bench-data";

interface SourceColumnProps {
  benchId: string;
}

export function SourceColumn({ benchId }: SourceColumnProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedContextSubjects, toggleContextSubject, selectAll, deselectAll } = useBench();
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const { 
    subjects, 
    editalItems, 
    materials, 
    isLoading, 
    toggleTopic, 
    deleteSubject,
    deleteMaterial,
    togglePin
  } = useBenchData(benchId);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const filteredSubjects = (subjects as any[]).filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMaterialsBySubject = (subjectId: string | null) => {
    return (materials as any[]).filter(m => m.subjectId === subjectId);
  };

  const getMaterialsByTopic = (topicId: string) => {
    return (materials as any[]).filter(m => m.editalItemId === topicId);
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    deleteSubject(subjectToDelete);
    toast.success("Disciplina excluída com sucesso!");
    setSubjectToDelete(null);
  };

  const uncategorizedMaterials = getMaterialsBySubject(null);

  return (
    <div className="flex flex-col h-full bg-secondary/5 border-r border-border/50 w-[350px] shrink-0 font-sans transition-all">
      {/* Header with Search and Actions */}
      <div className="p-4 space-y-4 border-b border-border/50 bg-background/50">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                    <HugeiconsIcon icon={Layers01Icon} size={14} />
                </div>
                <h3 className="font-bold text-sm tracking-tight">Biblioteca</h3>
            </div>
            <SubjectManager benchId={benchId} />
        </div>

        <div className="relative group/search">
          <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-2.5 text-muted-foreground group-focus-within/search:text-primary transition-colors" />
          <Input 
            placeholder="Buscar nas matérias..." 
            className="pl-9 h-9 text-xs rounded-xl bg-secondary/10 border-none focus-visible:ring-1 focus-visible:ring-primary/30 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center justify-between px-1">
             <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <HugeiconsIcon icon={FilterIcon} size={12} />
                Contexto de Estudo
             </div>
             {mounted && (
               <button 
                  onClick={() => {
                      if (selectedContextSubjects.length === subjects.length) {
                      deselectAll();
                      } else {
                      selectAll(subjects.map(s => s.id));
                      }
                  }}
                  className="text-[10px] font-bold text-primary hover:text-primary/80 transition-all bg-primary/5 px-2 py-0.5 rounded-full"
              >
                  {selectedContextSubjects.length === subjects.length ? "Limpar" : "Todos"}
              </button>
             )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {subjects.length === 0 && uncategorizedMaterials.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-muted-foreground mx-auto">
              <HugeiconsIcon icon={Book02Icon} size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold">Sua biblioteca está vazia</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Adicione matérias e materiais para começar sua jornada de estudos inteligente.</p>
            </div>
          </div>
        ) : (
          <div className="px-2 py-4 space-y-1">
            {/* Uncategorized Materials */}
            {uncategorizedMaterials.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/5 border border-transparent">
                  <div className="size-2 rounded-full shrink-0 bg-muted-foreground" />
                  <span className="text-sm font-bold truncate flex-1">Sem Disciplina</span>
                  <Badge variant="secondary" className="text-[10px] h-4 bg-secondary/20 font-bold">
                    {uncategorizedMaterials.length}
                  </Badge>
                </div>
                <div className="ml-8 border-l border-border/40 pl-2 space-y-1 pt-1 pb-2">
                   {uncategorizedMaterials.map(m => (
                     <MaterialItem 
                      key={m.id} 
                      material={m} 
                      onDelete={() => deleteMaterial(m.id)}
                      onTogglePin={() => togglePin({ materialId: m.id, isPinned: !m.isPinned })}
                    />
                   ))}
                </div>
              </div>
            )}

            {filteredSubjects.map((subject) => {
              const subjectMaterials = getMaterialsBySubject(subject.id);
              const subjectEditalItems = editalItems.filter(item => 
                item.category.toLowerCase().includes(subject.title.toLowerCase()) ||
                subject.title.toLowerCase().includes(item.category.toLowerCase())
              );
              
              const totalTopics = subjectEditalItems.length;
              const coveredTopics = subjectEditalItems.filter(i => i.isCovered).length;
              const progress = totalTopics > 0 ? (coveredTopics / totalTopics) * 100 : 0;

              const shownTopicIds = new Set(subjectEditalItems.map(i => i.id));
              const globalMaterials = subjectMaterials.filter(m => 
                !m.editalItemId || !shownTopicIds.has(m.editalItemId)
              );

              const isSelected = selectedContextSubjects.includes(subject.id);

              return (
                <div key={subject.id} className="space-y-0.5 animate-in fade-in slide-in-from-left-2 duration-300">
                    <div className={cn(
                        "group flex items-center gap-2 p-2 rounded-xl transition-all border border-transparent",
                        isSelected ? "bg-primary/5 border-primary/10" : "hover:bg-secondary/5"
                    )}>
                        <Switch 
                            checked={isSelected}
                            onCheckedChange={() => toggleContextSubject(subject.id)}
                            size="sm"
                            className="scale-75"
                        />
                        <CoverageRing 
                          progress={progress} 
                          size={18} 
                          strokeWidth={2.5} 
                          color={subject.colorTag}
                        />
                        <span className="text-sm font-bold truncate flex-1">{subject.title}</span>
                        
                        <DropdownMenu>
                            <DropdownMenuTrigger render={
                                <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-lg transition-opacity">
                                    <HugeiconsIcon icon={MoreHorizontalIcon} size={14} />
                                </Button>
                            } />
                            <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem className="gap-2">
                                    <HugeiconsIcon icon={PencilIcon} size={14} />
                                    Renomear
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                    className="gap-2 text-destructive"
                                    onClick={() => setSubjectToDelete(subject.id)}
                                >
                                    <HugeiconsIcon icon={Delete02Icon} size={14} />
                                    Excluir
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="ml-8 border-l border-border/40 pl-2 space-y-1 pt-1 pb-2">
                        {/* 1. Global Materials */}
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="global" className="border-none">
                                <AccordionTrigger className="py-1.5 px-2 hover:no-underline hover:bg-secondary/10 rounded-lg transition-all text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-transparent border-none">
                                    <div className="flex items-center gap-2">
                                        <HugeiconsIcon icon={Folder02Icon} size={12} />
                                        Geral
                                        <Badge variant="secondary" className="text-[9px] h-3.5 px-1 rounded-sm bg-secondary/30 font-bold ml-1">
                                            {globalMaterials.length}
                                        </Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-1 pb-2 pl-2 space-y-0.5 border-none">
                                    {globalMaterials.map(m => (
                                      <MaterialItem 
                                        key={m.id} 
                                        material={m} 
                                        onDelete={() => deleteMaterial(m.id)}
                                        onTogglePin={() => togglePin({ materialId: m.id, isPinned: !m.isPinned })}
                                      />
                                    ))}
                                    <AddMaterialDialog 
                                        benchId={benchId} 
                                        subjects={subjects} 
                                        initialSubjectId={subject.id}
                                        onSuccess={() => {}} 
                                        trigger={
                                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors group italic">
                                                <HugeiconsIcon icon={Plus} size={10} className="group-hover:scale-110 transition-transform" />
                                                Novo Material...
                                            </button>
                                        }
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        {/* 2. Structured Topics */}
                        <div className="space-y-0.5 mt-2">
                            <div className="flex items-center justify-between px-2 mb-1">
                                <span className="text-[9px] font-bold text-primary/40 uppercase tracking-widest">Assuntos</span>
                                <AddTopicDialog benchId={benchId} category={subject.title} />
                            </div>
                            
                            {subjectEditalItems.length === 0 ? (
                                <p className="text-[10px] text-muted-foreground italic px-2 py-1">Nenhum assunto definido.</p>
                            ) : (
                                subjectEditalItems.map(item => {
                                    const topicMaterials = getMaterialsByTopic(item.id);
                                    return (
                                        <Accordion key={item.id} type="single" collapsible className="w-full">
                                            <AccordionItem value={item.id} className="border-none">
                                                <div className="flex items-center group/topic transition-all hover:bg-secondary/5 rounded-lg">
                                                  <div className="pl-2">
                                                    <TopicToggle 
                                                      item={item} 
                                                      subjectTitle={subject.title} 
                                                      totalSubjectTopics={subjectEditalItems.length} 
                                                      coveredSubjectTopics={coveredTopics}
                                                      onToggle={(isCovered) => toggleTopic({ itemId: item.id, isCovered })}
                                                    />
                                                  </div>
                                                  
                                                  <AccordionTrigger className="py-1.5 pl-2 pr-2 hover:no-underline transition-all text-xs font-medium text-foreground/80 border-none flex-1 min-w-0">
                                                      <div className="flex items-center gap-2 text-left truncate">
                                                          <span className={cn(
                                                            "truncate transition-colors",
                                                            item.isCovered ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-foreground/80"
                                                          )}>
                                                            {item.topic}
                                                          </span>
                                                          {topicMaterials.length > 0 && (
                                                              <Badge variant="secondary" className="text-[9px] h-3.5 px-1 rounded-sm bg-primary/10 text-primary font-bold shrink-0">
                                                                  {topicMaterials.length}
                                                              </Badge>
                                                          )}
                                                      </div>
                                                  </AccordionTrigger>
                                                </div>
                                                <AccordionContent className="pt-1 pb-2 pl-4 space-y-0.5 border-none">
                                                    {topicMaterials.map(m => (
                                                      <MaterialItem 
                                                        key={m.id} 
                                                        material={m} 
                                                        onDelete={() => deleteMaterial(m.id)}
                                                        onTogglePin={() => togglePin({ materialId: m.id, isPinned: !m.isPinned })}
                                                      />
                                                    ))}
                                                    <AddMaterialDialog 
                                                        benchId={benchId} 
                                                        subjects={subjects} 
                                                        initialSubjectId={subject.id}
                                                        initialEditalItemId={item.id}
                                                        onSuccess={() => {}} 
                                                        trigger={
                                                            <button className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors group italic">
                                                                <HugeiconsIcon icon={Plus} size={10} className="group-hover:scale-110 transition-transform" />
                                                                Adicionar neste assunto...
                                                            </button>
                                                        }
                                                    />
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!subjectToDelete}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
        title="Excluir Disciplina?"
        description="Tem certeza que deseja excluir esta disciplina e todos os seus materiais? Esta ação não pode ser desfeita."
        onConfirm={handleDeleteSubject}
        variant="destructive"
      />
    </div>
  );
}

function MaterialItem({ material, onDelete, onTogglePin }: { 
  material: any; 
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const isNew = material.createdAt && (new Date().getTime() - new Date(material.createdAt).getTime() < 1000 * 60 * 5);
  const isOptimistic = (material as any).isOptimistic;

  const handleDelete = () => {
    onDelete();
    toast.success("Material removido!");
    setIsDeleteDialogOpen(false);
  };

  const handleTogglePin = () => {
    onTogglePin();
    toast.success(material.isPinned ? "Material removido do topo" : "Material fixado no topo!");
  };

  return (
    <div className={cn(
      "group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background transition-all cursor-pointer relative",
      (isNew || isOptimistic) && "border border-primary/20 bg-primary/5"
    )}>
      <div className={cn(
        "size-1.5 rounded-full shrink-0 transition-colors",
        isOptimistic ? "bg-primary animate-pulse" : isNew ? "bg-primary animate-ping" : "bg-border/50"
      )} />
      <span className={cn(
        "text-xs font-medium truncate flex-1 group-hover:text-primary transition-colors",
        isOptimistic && "text-muted-foreground italic"
      )}>
        {material.title}
        {isOptimistic && " (Sincronizando...)"}
      </span>
      {material.isPinned && <HugeiconsIcon icon={PinIcon} size={10} className="text-primary" />}
      
      {!isOptimistic && (
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded-md transition-opacity">
              <HugeiconsIcon icon={MoreHorizontalIcon} size={12} />
            </Button>
          } />
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem className="gap-2" onClick={handleTogglePin}>
              <HugeiconsIcon icon={material.isPinned ? PinOffIcon : PinIcon} size={14} />
              {material.isPinned ? "Desafixar" : "Fixar no topo"}
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="gap-2 text-destructive" 
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Excluir Material?"
        description="Tem certeza que deseja excluir este material? Esta ação não pode ser desfeita."
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}

function TopicToggle({ 
  item, 
  subjectTitle, 
  totalSubjectTopics, 
  coveredSubjectTopics,
  onToggle
}: { 
  item: any; 
  subjectTitle: string;
  totalSubjectTopics: number;
  coveredSubjectTopics: number;
  onToggle: (isCovered: boolean) => void;
}) {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !item.isCovered;
    
    onToggle(newStatus);

    if (newStatus) {
      toast.success("Tópico Concluído! 🎉", {
        description: `Você venceu o assunto "${item.topic}". Continue assim!`,
        icon: "🔥",
      });

      if (totalSubjectTopics > 0 && (coveredSubjectTopics + 1) === totalSubjectTopics) {
        setTimeout(() => {
          toast.success("MATÉRIA VENCIDA! 🏆", {
            description: `Parabéns! Você concluiu todos os tópicos de "${subjectTitle}".`,
            className: "bg-primary text-primary-foreground border-none",
          });
        }, 800);
      }
    }
  };

  return (
    <button 
      onClick={handleToggle}
      className={cn(
        "size-5 rounded-md border flex items-center justify-center transition-all shrink-0",
        item.isCovered 
          ? "bg-emerald-500 border-emerald-500 text-white opacity-100 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
          : "border-border hover:border-primary/50 text-transparent opacity-40 hover:opacity-100"
      )}
    >
      <HugeiconsIcon icon={Tick01Icon} size={10} strokeWidth={3} />
    </button>
  );
}
