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
import { Edit02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { getMaterialContent } from "@/lib/actions/fetch-bench";
import Link from "next/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";

interface ViewNoteDialogProps {
  materialId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewNoteDialog({ materialId, title, open, onOpenChange }: ViewNoteDialogProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[70vw] max-w-6xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b flex-row items-center justify-between space-y-0 shrink-0">
          <DialogTitle className="text-xl font-bold truncate pr-4">{title}</DialogTitle>
          <div className="flex items-center gap-2 pr-6">
            <Link href={`/dashboard/cadernos/${materialId}`} passHref>
              <Button variant="default" size="sm" className="gap-2 shrink-0">
                <HugeiconsIcon icon={Edit02Icon} size={16} />
                Ir para a anotação
              </Button>
            </Link>
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground gap-2">
              <HugeiconsIcon icon={Loading03Icon} className="animate-spin" size={24} />
              <span>Carregando anotação...</span>
            </div>
          ) : content ? (
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground italic">
              Anotação vazia.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
