"use client";

import { useState, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  PlusSignIcon,
  Loading03Icon,
  Cancel01Icon,
  Tick01Icon,
  Link01Icon,
  Doc01Icon,
  Plus,
  Note01Icon,
  Target02Icon,
  FileUploadIcon
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { addMaterial } from "@/lib/actions/bench";

interface AddMaterialDialogProps {
  benchId: string;
  subjects: { id: string; title: string }[];
  onSuccess: () => void;
  trigger?: React.ReactElement;
  initialSubjectId?: string;
  initialEditalItemId?: string;
}

export function AddMaterialDialog({ 
  benchId, 
  subjects, 
  onSuccess, 
  trigger, 
  initialSubjectId,
  initialEditalItemId 
}: AddMaterialDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [type, setType] = useState<"pdf" | "link" | "text" | "anotacao" | "simulado" | "flashcard">("pdf");
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState(initialSubjectId || "");
  const [editalItemId, setEditalItemId] = useState(initialEditalItemId || "");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.replace(".pdf", ""));
    } else {
      toast.error("Por favor, selecione um arquivo PDF.");
    }
  };

  const handleUpload = async () => {
    if (!title) {
      toast.error("Preencha o título.");
      return;
    }

    if (!subjectId && type !== "pdf") {
      toast.error("Selecione a disciplina.");
      return;
    }

    if (type === "pdf" && !file) {
      toast.error("Selecione um arquivo PDF.");
      return;
    }

    if (type === "link" && !url) {
      toast.error("Informe a URL.");
      return;
    }

    setIsPending(true);
    const formData = new FormData();
    formData.append("benchId", benchId);
    if (subjectId) formData.append("subjectId", subjectId);
    if (editalItemId) formData.append("editalItemId", editalItemId);
    formData.append("title", title);
    formData.append("type", type);
    formData.append("isPinned", isPinned.toString());
    if (file) formData.append("file", file);
    if (url) formData.append("url", url);

    try {
      const result = await addMaterial(formData);
      if (result.success) {
        toast.success("Lido e memorizado! 🧠", {
          description: `Identifiquei o material "${title}". Vamos começar os estudos?`,
          action: {
            label: "Começar",
            onClick: () => console.log("Abrir chat ou material")
          }
        });
        onSuccess();
        setIsOpen(false);
        resetForm();
      } else {
        throw new Error(result.error || "Erro ao adicionar");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error("Erro: " + message);
    } finally {
      setIsPending(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setSubjectId(initialSubjectId || "");
    setEditalItemId(initialEditalItemId || "");
    setUrl("");
    setType("pdf");
    setIsPinned(false);
  };

  const defaultTrigger = (
    <Button variant="outline" className="w-full gap-2">
      <HugeiconsIcon icon={PlusSignIcon} size={16} />
      Novo Conteúdo
    </Button>
  );

  const MATERIAL_TYPES = [
    { id: "pdf", label: "Material PDF", icon: Doc01Icon },
    { id: "anotacao", label: "Anotação", icon: Note01Icon },
    { id: "simulado", label: "Simulado", icon: Target02Icon },
    { id: "link", label: "Link Externo", icon: Link01Icon },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (open) resetForm();
    }}>
      <DialogTrigger render={trigger || defaultTrigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Plus} size={20} className="text-primary" />
            Adicionar Conteúdo
          </DialogTitle>
          <DialogDescription>
            Organize seu estudo adicionando novos materiais ou anotações.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label>Tipo de Conteúdo</Label>
            <div className="grid grid-cols-2 gap-2">
                {MATERIAL_TYPES.map((t) => (
                    <Button 
                        key={t.id}
                        variant={type === t.id ? "default" : "outline"} 
                        className="gap-2 text-xs"
                        onClick={() => setType(t.id as any)}
                    >
                        <HugeiconsIcon icon={t.icon} size={14} />
                        {t.label}
                    </Button>
                ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Título</Label>
            <Input 
                id="title" 
                placeholder="Ex: Resumo de Atos Administrativos" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {!initialSubjectId && (
            <div className="flex flex-col gap-2">
              <Label>Disciplina</Label>
              <Select value={subjectId} onValueChange={(val) => setSubjectId(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "pdf" && (
            <div className="flex flex-col gap-2">
              <Label>Arquivo PDF</Label>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="application/pdf"
                onChange={handleFileChange}
              />
              {!file ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors cursor-pointer bg-secondary/5"
                >
                  <HugeiconsIcon icon={FileUploadIcon} size={24} className="text-muted-foreground" />
                  <p className="text-xs font-bold text-muted-foreground">Clique para selecionar PDF</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <HugeiconsIcon icon={Doc01Icon} size={18} className="text-primary" />
                  <span className="text-sm font-bold flex-1 truncate">{file.name}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => setFile(null)}>
                    <HugeiconsIcon icon={Cancel01Icon} size={14} />
                  </Button>
                </div>
              )}
            </div>
          )}

          {type === "link" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="url">Link / URL</Label>
              <Input 
                id="url" 
                placeholder="https://..." 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl border bg-secondary/5">
             <div className="space-y-0.5">
                <Label className="text-sm font-bold">Fixar no Topo</Label>
                <p className="text-[10px] text-muted-foreground">Acesso rápido no topo da disciplina</p>
             </div>
             <Switch checked={isPinned} onCheckedChange={setIsPinned} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button 
            className="flex-1 gap-2" 
            disabled={isPending || (type === "pdf" && !file) || (type === "link" && !url)}
            onClick={handleUpload}
          >
            {isPending ? (
              <>
                <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <HugeiconsIcon icon={Tick01Icon} size={18} />
                Confirmar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
