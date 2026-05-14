"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlusSignIcon, Loading03Icon, FolderIcon, Tick01Icon } from "@hugeicons/core-free-icons";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSubject } from "@/lib/actions/bench";
import { toast } from "sonner";
import { useBenchData } from "@/hooks/use-bench-data";

interface SubjectManagerProps {
  benchId: string;
}

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"
];

export function SubjectManager({ benchId }: SubjectManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [colorTag, setColorTag] = useState(PRESET_COLORS[0]);

  const { addSubject } = useBenchData(benchId);

  const handleCreate = async () => {
    if (!title) {
      toast.error("Informe o nome da disciplina.");
      return;
    }

    addSubject({ title, colorTag });
    toast.success(`Disciplina "${title}" sendo criada...`);
    setIsOpen(false);
    setTitle("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon-xs" className="text-primary hover:bg-primary/10">
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
        </Button>
      } />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={FolderIcon} size={20} className="text-primary" />
            Nova Disciplina
          </DialogTitle>
          <DialogDescription>
            Crie uma nova disciplina para organizar seus materiais e estudos.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Nome da Disciplina</Label>
            <Input 
                id="title" 
                placeholder="Ex: Direito Administrativo" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Cor de Destaque</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setColorTag(color)}
                  className={`size-8 rounded-lg border-2 transition-all ${colorTag === color ? "border-primary scale-110 shadow-md" : "border-transparent"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={() => setIsOpen(false)}
          >
            Cancelar
          </Button>
          <Button 
            className="flex-1 gap-2" 
            disabled={!title}
            onClick={handleCreate}
          >
            <HugeiconsIcon icon={Tick01Icon} size={18} />
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
