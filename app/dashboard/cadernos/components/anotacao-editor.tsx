"use client";

import { useMemo, useState, useEffect } from "react";
import { Editor } from "./editor";
import { updateAnotacaoContent, deleteAnotacao } from "@/lib/actions/cadernos";
import { useCadernos } from "@/hooks/use-cadernos";
import { debounce } from "@/lib/utils";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AnotacaoEditorProps {
  anotacao: {
    id: string;
    title: string;
    content: string | null;
  };
}

export function AnotacaoEditor({ anotacao }: AnotacaoEditorProps) {
  const { updateAnotacaoLocal, deleteAnotacaoLocal } = useCadernos();
  const router = useRouter();
  const [localTitle, setLocalTitle] = useState(anotacao.title);

  useEffect(() => {
    setLocalTitle(anotacao.title);
  }, [anotacao.id, anotacao.title]);

  // Auto-save logic for content and title
  const debouncedSave = useMemo(
    () =>
      debounce(async (id: string, content: string, title: string) => {
        await updateAnotacaoContent(id, content, title);
      }, 1500),
    []
  );

  const handleContentChange = (newContent: string) => {
    updateAnotacaoLocal(anotacao.id, { content: newContent });
    debouncedSave(anotacao.id, newContent, localTitle);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    updateAnotacaoLocal(anotacao.id, { title: newTitle });
    debouncedSave(anotacao.id, anotacao.content || "", newTitle);
  };

  const handleDelete = async () => {
    const res = await deleteAnotacao(anotacao.id);
    if (res.success) {
      deleteAnotacaoLocal(anotacao.id);
      toast.success("Anotação excluída com sucesso");
      router.push("/dashboard/cadernos");
    } else {
      toast.error("Erro ao excluir anotação");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="px-6 py-4 border-b flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex-1 mr-4">
          <input 
            type="text"
            value={localTitle}
            onChange={handleTitleChange}
            placeholder="Título da anotação"
            className="w-full bg-transparent text-xl font-bold tracking-tight text-foreground focus:outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-muted px-2 py-1 rounded">
            Salvo automaticamente
          </span>
          <ConfirmDialog
            title="Excluir Anotação"
            description="Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita."
            onConfirm={handleDelete}
            variant="destructive"
            trigger={
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 ml-2">
                <HugeiconsIcon icon={Delete01Icon} size={16} />
              </Button>
            }
          />
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <Editor 
          key={anotacao.id}
          initialContent={anotacao.content || ""} 
          onChange={handleContentChange} 
        />
      </div>
    </div>
  );
}
