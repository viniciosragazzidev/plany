'use client'

import { useState, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  FileUploadIcon, 
  PlusSignIcon,
  Loading03Icon,
  Cancel01Icon,
  FileAttachmentIcon,
  Tick01Icon,
  AiChat01Icon
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
import { toast } from "sonner";
import { processEditalPDF } from "@/lib/actions/bench";

interface ImportEditalDialogProps {
  benchId: string;
  onSuccess: () => void;
  trigger?: React.ReactElement;
}

export function ImportEditalDialog({ benchId, onSuccess, trigger }: ImportEditalDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
    } else {
      toast.error("Por favor, selecione um arquivo PDF.");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("benchId", benchId);

    try {
      const result = await processEditalPDF(formData);
      if (result.success) {
        toast.success("Edital processado com sucesso!", {
          description: `Extraímos ${result.data?.topicCount || 0} tópicos do edital.`,
        });
        onSuccess();
        setIsOpen(false);
        setFile(null);
      } else {
        throw new Error(result.error || "Erro ao processar PDF");
      }
    } catch (error: any) {
      toast.error("Erro ao importar edital: " + error.message);
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="w-full gap-2">
      <HugeiconsIcon icon={FileUploadIcon} size={16} />
      Importar Edital PDF
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={trigger || defaultTrigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={FileAttachmentIcon} size={20} className="text-primary" />
            Importar Edital
          </DialogTitle>
          <DialogDescription>
            A IA analisará o edital para extrair o conteúdo programático e cronogramas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
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
              className="border-2 border-dashed border-border/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors cursor-pointer bg-secondary/5"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <HugeiconsIcon icon={FileUploadIcon} size={24} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold">Clique para selecionar</p>
                <p className="text-xs text-muted-foreground">PDF de até 10MB</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/20">
              <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                <HugeiconsIcon icon={FileAttachmentIcon} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon-sm" 
                onClick={() => setFile(null)}
                className="text-muted-foreground hover:text-destructive"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} />
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/10 p-3 rounded-xl">
              <HugeiconsIcon icon={AiChat01Icon} size={14} className="text-primary shrink-0 mt-0.5" />
              <span>
                Nossa IA identificará automaticamente o **Conteúdo Programático** e criará o plano de cobertura.
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1" 
            onClick={() => setIsOpen(false)}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button 
            className="flex-1 gap-2" 
            disabled={!file || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? (
              <>
                <HugeiconsIcon icon={Loading03Icon} size={18} className="animate-spin" />
                Processando...
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
