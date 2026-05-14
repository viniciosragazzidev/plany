'use client'

import React, { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  FileAttachmentIcon, 
  FolderIcon, 
  Plus, 
  Search01Icon, 
  Book02Icon, 
  Note01Icon, 
  Target02Icon, 
  MoreHorizontalIcon, 
  PencilIcon, 
  Delete02Icon, 
  PinIcon, 
  PinOffIcon,
  Tick01Icon
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { updateExamNotice, deleteSubject, deleteMaterial, togglePinMaterial } from "@/lib/actions/bench";
import { ImportEditalDialog } from "@/components/onboarding/import-edital-dialog";
import { AddMaterialDialog } from "./add-material-dialog";
import { SubjectManager } from "./subject-manager";
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

interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'link' | 'text' | 'anotacao' | 'simulado' | 'flashcard';
  subjectTitle: string;
  subjectId: string | null;
  isPinned: boolean;
}
interface EditalItem {
  id: string;
  category: string;
  topic: string;
  isCovered: boolean;
}

interface SourceColumnProps {
  benchId: string;
  materials: Material[];
  examNotice?: string | null;
  editalItems?: EditalItem[];
  subjects?: { id: string; title: string; colorTag: string; icon?: string | null }[];
}

export function SourceColumn({ benchId, materials, examNotice: initialExamNotice, editalItems = [], subjects = [] }: SourceColumnProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedContextSubjects, toggleContextSubject, selectAll, deselectAll } = useBench();
  const [subjectToDelete, setSubjectToDelete] = useState<string | null>(null);

  const totalCount = editalItems.length;
  const coveredCount = editalItems.filter(item => item.isCovered).length;
  const coveragePercent = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;

  const filteredSubjects = subjects.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getMaterialsBySubject = (subjectId: string) => {
    const subjectMaterials = materials.filter(m => m.subjectId === subjectId);
    return {
      materials: subjectMaterials.filter(m => ['pdf', 'link', 'text'].includes(m.type)),
      notes: subjectMaterials.filter(m => m.type === 'anotacao'),
      quizzes: subjectMaterials.filter(m => ['simulado', 'flashcard'].includes(m.type)),
    };
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    const result = await deleteSubject(subjectToDelete);
    if (result.success) {
      toast.success("Disciplina excluída.");
      setSubjectToDelete(null);
    } else {
      toast.error("Erro ao excluir disciplina.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-secondary/5 border-r border-border/50 w-[300px] shrink-0 font-sans">
      {/* Search Bar */}
      <div className="p-4 border-b border-border/50 bg-background/50">
        <div className="relative">
          <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
          <Input 
            placeholder="Buscar na disciplina..." 
            className="pl-9 h-9 text-xs rounded-xl bg-secondary/10 border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Edital Section (Condensed) */}
      <div className="p-4 border-b border-border/50 space-y-3 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider text-primary">
            <HugeiconsIcon icon={FileAttachmentIcon} size={14} />
            Edital Ativo
          </div>
          <ImportEditalDialog 
            benchId={benchId} 
            onSuccess={() => {}} 
            trigger={
              <Button variant="ghost" size="icon-xs" className="text-primary hover:bg-primary/10">
                <HugeiconsIcon icon={Plus} size={14} />
              </Button>
            }
          />
        </div>
        
        {totalCount > 0 ? (
          <div className="flex items-center gap-3 bg-background p-2 rounded-lg border border-primary/20">
             <div className="h-1.5 flex-1 bg-primary/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all" 
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-primary">{coveragePercent}%</span>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">Nenhum edital importado</p>
        )}
      </div>

      {/* Subjects Section */}
      <div className="p-4 border-b border-border/50 bg-background/30 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-[10px] uppercase tracking-wider text-muted-foreground">
            <HugeiconsIcon icon={FolderIcon} size={14} />
            Minhas Matérias
          </div>
          <SubjectManager benchId={benchId} />
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
              Contexto do Chat
            </span>
            <button 
              onClick={() => {
                if (selectedContextSubjects.length === subjects.length) {
                  deselectAll();
                } else {
                  selectAll(subjects.map(s => s.id));
                }
              }}
              className="text-[10px] font-bold text-primary hover:underline transition-all"
            >
              {selectedContextSubjects.length === subjects.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {subjects.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-muted-foreground mx-auto">
              <HugeiconsIcon icon={FolderIcon} size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold">Nenhuma disciplina</p>
              <p className="text-xs text-muted-foreground">Comece criando sua primeira disciplina para organizar seus estudos.</p>
            </div>
          </div>
        ) : (
          <Accordion multiple className="w-full px-2 py-2 border-none">
            {filteredSubjects.map((subject) => {
              const { materials: subMats, notes, quizzes } = getMaterialsBySubject(subject.id);
              const totalItems = subMats.length + notes.length + quizzes.length;
              const isSelected = selectedContextSubjects.includes(subject.id);

              return (
                <AccordionItem key={subject.id} value={subject.id} className="border-none mb-1">
                  <div className="flex items-center group pr-2">
                    <AccordionTrigger className="flex-1 py-2 px-2 hover:no-underline hover:bg-secondary/10 rounded-xl transition-all">
                      <div className="flex items-center gap-2 text-left">
                           <Switch 
                        checked={isSelected}
                        onCheckedChange={() => toggleContextSubject(subject.id)}
                        size="sm"
                      />
                        <div 
                          className="size-2 rounded-full shrink-0" 
                          style={{ backgroundColor: subject.colorTag }} 
                        />
                        <span className="text-sm font-bold truncate max-w-[120px]">{subject.title}</span>
                        <Badge variant="secondary" className="text-[9px] h-4 px-1 rounded-md bg-secondary/20 font-bold">
                          {totalItems}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    
                    <div className="flex items-center gap-1.5">
                   
                      <DropdownMenu>
                        <DropdownMenuTrigger render={
                          <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 h-7 w-7">
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
                  </div>

                  <AccordionContent className="pt-1 pb-2 pl-8 pr-2 space-y-1">
                    {/* Category: Materials */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          <HugeiconsIcon icon={Book02Icon} size={12} />
                          Materiais
                        </div>
                        <span>{subMats.length}</span>
                      </div>
                      {subMats.map(m => <MaterialItem key={m.id} material={m} />)}
                      <AddMaterialDialog 
                        benchId={benchId} 
                        subjects={subjects} 
                        initialSubjectId={subject.id}
                        onSuccess={() => {}} 
                        trigger={
                          <button className="w-full flex items-center gap-2 px-2 py-1.5 text-[10px] text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors group">
                            <HugeiconsIcon icon={Plus} size={12} className="group-hover:scale-110 transition-transform" />
                            Adicionar Material
                          </button>
                        }
                      />
                    </div>

                    {/* Category: Notes */}
                    <div className="space-y-1 pt-2">
                      <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          <HugeiconsIcon icon={Note01Icon} size={12} />
                          Anotações
                        </div>
                        <span>{notes.length}</span>
                      </div>
                      {notes.map(m => <MaterialItem key={m.id} material={m} />)}
                    </div>

                    {/* Category: Quizzes */}
                    <div className="space-y-1 pt-2">
                      <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1">
                        <div className="flex items-center gap-1.5">
                          <HugeiconsIcon icon={Target02Icon} size={12} />
                          Simulados
                        </div>
                        <span>{quizzes.length}</span>
                      </div>
                      {quizzes.map(m => <MaterialItem key={m.id} material={m} />)}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
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

function MaterialItem({ material }: { material: Material }) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const handleDelete = async () => {
    await deleteMaterial(material.id);
    toast.success("Material excluído.");
    setIsDeleteDialogOpen(false);
  };

  const handleTogglePin = async () => {
    await togglePinMaterial(material.id, !material.isPinned);
    toast.success(material.isPinned ? "Material desfixado" : "Material fixado no topo");
  };

  return (
    <div className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background transition-all cursor-pointer relative">
      <div className="size-1.5 rounded-full bg-border shrink-0" />
      <span className="text-xs font-medium truncate flex-1 group-hover:text-primary transition-colors">
        {material.title}
      </span>
      {material.isPinned && <HugeiconsIcon icon={PinIcon} size={10} className="text-primary" />}
      
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 h-5 w-5 rounded-md">
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
