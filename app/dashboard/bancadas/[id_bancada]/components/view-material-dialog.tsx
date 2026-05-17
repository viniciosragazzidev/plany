"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Edit02Icon, 
  Loading03Icon, 
  Link01Icon, 
  Copy02Icon, 
  CheckListIcon 
} from "@hugeicons/core-free-icons";
import { getMaterialContent } from "@/lib/actions/fetch-bench";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface ViewMaterialDialogProps {
  materialId: string;
  title: string;
  type: string;
  storageUrl?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewMaterialDialog({ 
  materialId, 
  title, 
  type,
  storageUrl,
  open, 
  onOpenChange 
}: ViewMaterialDialogProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getMaterialContent(materialId).then((res) => {
        setContent(res);
        setLoading(false);
      });
    } else {
      setContent(null);
    }
  }, [materialId, open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      setIsCopied(true);
      toast.success("Conteúdo copiado!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const isEditableNote = type === "anotacao";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[70vw] max-w-6xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-border/50">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between space-y-0 shrink-0 bg-secondary/5">
          <div className="flex-1 min-w-0 pr-4">
            <DialogTitle className="text-lg font-bold truncate" title={title}>
              {title}
            </DialogTitle>
            {storageUrl && (
              <p className="text-[10px] font-bold text-muted-foreground truncate mt-1">
                Origem: <span className="text-primary/70">{storageUrl}</span>
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0 pr-6">
            {isEditableNote ? (
              <Link href={`/dashboard/cadernos/${materialId}`} passHref>
                <Button variant="default" size="sm" className="gap-2 shrink-0 text-xs font-bold rounded-xl shadow-lg shadow-primary/20">
                  <HugeiconsIcon icon={Edit02Icon} size={14} />
                  Ir para a anotação
                </Button>
              </Link>
            ) : storageUrl ? (
              <a href={storageUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="default" size="sm" className="gap-2 shrink-0 text-xs font-bold rounded-xl bg-primary shadow-lg shadow-primary/20">
                  <HugeiconsIcon icon={Link01Icon} size={14} />
                  Acessar Link Original
                </Button>
              </a>
            ) : null}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-muted-foreground gap-3">
              <HugeiconsIcon icon={Loading03Icon} className="animate-spin text-primary" size={28} />
              <span className="text-sm font-medium">Processando e carregando o material...</span>
            </div>
          ) : content ? (
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none p-4 rounded-2xl bg-secondary/5 border border-border/50 shadow-inner">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground italic text-sm">
              Nenhum conteúdo disponível neste material.
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t shrink-0 bg-secondary/5 items-center justify-end">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="gap-2 text-xs font-bold rounded-xl border-border/50 hover:bg-secondary/20"
            disabled={!content}
          >
            <HugeiconsIcon icon={Copy02Icon} size={14} />
            {isCopied ? "Copiado!" : "Copiar Conteúdo"}
          </Button>
          <Button 
            onClick={() => onOpenChange(false)} 
            className="gap-2 text-xs font-bold rounded-xl"
            variant="secondary"
          >
            <HugeiconsIcon icon={CheckListIcon} size={14} />
            Fechar Visualização
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
