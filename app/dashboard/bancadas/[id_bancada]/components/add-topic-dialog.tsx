"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  PlusSignIcon,
  Loading03Icon,
  Cancel01Icon,
  Tick01Icon,
  Tag01Icon
} from "@hugeicons/core-free-icons";
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
import { toast } from "sonner";
import { createTopic } from "@/lib/actions/bench";

interface AddTopicDialogProps {
  benchId: string;
  category: string;
  onSuccess?: () => void;
  trigger?: React.ReactElement;
}

export function AddTopicDialog({ benchId, category, onSuccess, trigger }: AddTopicDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [topic, setTopic] = useState("");

  const handleCreate = async () => {
    if (!topic) {
      toast.error("Informe o nome do assunto.");
      return;
    }

    setIsPending(true);
    try {
      const result = await createTopic({
        benchId,
        category,
        topic,
      });

      if (result.success) {
        toast.success("Assunto adicionado!");
        setIsOpen(false);
        setTopic("");
        onSuccess?.();
      } else {
        toast.error("Erro: " + result.error);
      }
    } catch (error) {
      toast.error("Erro ao criar assunto.");
    } finally {
      setIsPending(false);
    }
  };

  const defaultTrigger = (
    <Button variant="ghost" size="icon-xs" className="h-6 w-6">
      <HugeiconsIcon icon={PlusSignIcon} size={14} />
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={trigger || defaultTrigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Tag01Icon} size={20} className="text-primary" />
            Novo Assunto
          </DialogTitle>
          <DialogDescription>
            Adicione um novo tópico de estudo para a disciplina <strong>{category}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="topic">Nome do Assunto</Label>
            <Input 
              id="topic" 
              placeholder="Ex: Concordância Nominal" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button className="flex-1 gap-2" onClick={handleCreate} disabled={isPending || !topic}>
            {isPending ? (
              <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={18} />
            ) : (
              <HugeiconsIcon icon={Tick01Icon} size={18} />
            )}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
