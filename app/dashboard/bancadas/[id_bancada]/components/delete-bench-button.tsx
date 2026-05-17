"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Settings02Icon, Delete02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteStudyBench } from "@/lib/actions/bench";
import { toast } from "sonner";

export function DeleteBenchButton({ benchId }: { benchId: string }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleDelete = async () => {
    setIsPending(true);
    try {
      const result = await deleteStudyBench(benchId);
      if (result.success) {
        toast.success("Bancada excluída com sucesso.");
        // Keep isPending true and dialog open so UI doesn't flash the deleted bench
        router.push("/dashboard/bancadas");
      } else {
        toast.error(result.error || "Erro ao excluir bancada.");
        setIsPending(false);
      }
    } catch (error) {
      toast.error("Erro inesperado ao excluir bancada.");
      setIsPending(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={
          <Button variant="outline" size="sm" className="rounded-xl gap-2 h-9">
            <HugeiconsIcon icon={Settings02Icon} size={16} />
            Configurações
          </Button>
        } />
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            className="text-destructive gap-2 cursor-pointer"
            onClick={() => setIsDialogOpen(true)}
          >
            <HugeiconsIcon icon={Delete02Icon} size={16} />
            Excluir Bancada
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Bancada</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta bancada? Esta ação não pode ser desfeita e todos os materiais e progresso serão perdidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? (
                <>
                  <HugeiconsIcon icon={Loading03Icon} className="animate-spin mr-2" size={16} />
                  Excluindo...
                </>
              ) : (
                "Sim, excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
