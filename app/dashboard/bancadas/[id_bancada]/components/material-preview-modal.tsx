'use client';

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  
  Download02Icon,
  Link01Icon,
  CheckListIcon,
  Copy02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface WebSource {
  id: string;
  title: string;
  sourceUrl: string;
  topic: string;
  authorityScore: number;
  markdownLength: number;
  markdownContent?: string;
}

interface MaterialPreviewModalProps {
  materialId: string;
  onClose: () => void;
  results: WebSource[];
}

export function MaterialPreviewModal({
  materialId,
  onClose,
  results,
}: MaterialPreviewModalProps) {
  const material = results.find((r) => r.id === materialId);
  const [isCopied, setIsCopied] = useState(false);

  if (!material) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(material.markdownContent || "");
      setIsCopied(true);
      toast.success("Conteúdo copiado!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  return (
    <Dialog open={!!materialId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-bold line-clamp-2">{material.title}</h2>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {material.sourceUrl}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 hover:bg-secondary rounded-lg p-2 transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
            </button>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-xs pt-2">
            <span className="bg-primary/10 text-primary px-2 py-1 rounded">
              ⭐ Autoridade: {material.authorityScore}/100
            </span>
            <span className="text-muted-foreground">
              {material.markdownLength} palavras
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg bg-secondary/5 border border-border/50">
            {material.markdownContent ? (
              <ReactMarkdown>{material.markdownContent}</ReactMarkdown>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Conteúdo não disponível para visualização
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <a
            href={material.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <Button variant="outline" className="w-full gap-2">
              <HugeiconsIcon icon={Link01Icon} size={16} />
              Visitar Fonte
            </Button>
          </a>
          <Button
            variant="outline"
            onClick={handleCopy}
            className="flex-1 gap-2"
            disabled={!material.markdownContent}
          >
            <HugeiconsIcon icon={Copy02Icon} size={16} />
            {isCopied ? "Copiado!" : "Copiar"}
          </Button>
          <Button onClick={onClose} className="flex-1 gap-2">
            <HugeiconsIcon icon={CheckListIcon} size={16} />
            Voltar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
