'use client'

import { useState, useRef, useEffect } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  FileUploadIcon, 
  PlusSignIcon,
  Loading03Icon,
  Cancel01Icon,
  FileAttachmentIcon,
  Tick01Icon,
  AiChat01Icon,
  Search01Icon,
  LibraryIcon
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
import { toast } from "sonner";
import { processEditalPDF } from "@/lib/actions/bench";
import { searchPublicEditais, selectPublicEdital } from "@/lib/actions/public-edital";
import { useThrottledCallback } from "@/hooks/use-throttled-callback";
import { cn } from "@/lib/utils";

interface ImportEditalDialogProps {
  benchId: string;
  onSuccess: () => void;
  trigger?: React.ReactElement;
}

export function ImportEditalDialog({ benchId, onSuccess, trigger }: ImportEditalDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = useThrottledCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await searchPublicEditais(query);
      if (res.success) {
        setSearchResults(res.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  }, 500);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  const handleSelectPublic = async (publicId: string) => {
    setIsUploading(true);
    try {
      const res = await selectPublicEdital(benchId, publicId);
      if (res.success) {
        toast.success("Edital vinculado com sucesso!");
        onSuccess();
        setIsOpen(false);
      } else {
        throw new Error(res.error);
      }
    } catch (error: any) {
      toast.error("Erro ao vincular edital: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setSearchQuery(""); // Clear search when file is selected
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
        toast.success("Edital processado com sucesso!");
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
      <DialogContent className="sm:max-w-[320px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={LibraryIcon} size={20} className="text-primary" />
            Configurar Edital
          </DialogTitle>
          <DialogDescription>
            Busque ou faça o upload do PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {/* Phase 1: Search */}
          <div className="space-y-2">
            <div className="relative">
              <HugeiconsIcon 
                icon={Search01Icon} 
                size={16} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" 
              />
              <Input 
                placeholder="Pesquisar editais..." 
                className="pl-10 h-10 rounded-xl bg-secondary/10 border-border/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isUploading || !!file}
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <HugeiconsIcon icon={Loading03Icon} size={16} className="animate-spin text-primary" />
                </div>
              )}
            </div>

            {searchResults.length > 0 && searchQuery.length >= 3 && (
              <div className="border border-border/50 rounded-xl overflow-hidden bg-background shadow-sm">
                <div className="max-h-48 overflow-y-auto">
                  {searchResults.map((edital) => (
                    <div 
                      key={edital.id}
                      onClick={() => handleSelectPublic(edital.id)}
                      className="p-3 hover:bg-primary/5 cursor-pointer border-b border-border/30 last:border-0 flex flex-col gap-0.5"
                    >
                      <div className="text-sm font-bold flex items-center justify-between gap-2 overflow-hidden">
                        <span className="truncate flex-1" title={edital.institution}>{edital.institution}</span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">{edital.year}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate" title={edital.role}>{edital.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="bg-background px-2">ou upload do edital</span>
            </div>
          </div>

          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="application/pdf"
            onChange={handleFileChange}
          />
          
          {!file ? (
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed border-border/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors cursor-pointer bg-secondary/5",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
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
                disabled={isUploading}
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
