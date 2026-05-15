import { HugeiconsIcon } from "@hugeicons/react";
import { Note01Icon, Plus, Mouse01Icon } from "@hugeicons/core-free-icons";

export default function CadernosPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background relative h-full">
        {/* Empty State */}
        <div className="max-w-md space-y-6 flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-primary/5 rounded-[2rem] flex items-center justify-center border-2 border-primary/10 shadow-2xl shadow-primary/5">
                <HugeiconsIcon icon={Note01Icon} size={48} className="text-primary opacity-80" />
            </div>
            
            <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Seu Segundo Cérebro</h2>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                    Selecione uma anotação na lateral ou crie uma nova para começar a capturar ideias. Tudo será sincronizado instantaneamente.
                </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest pt-4">
                <span className="flex items-center gap-1"><HugeiconsIcon icon={Mouse01Icon} size={14} /> Selecione</span>
                <span>ou</span>
                <span className="flex items-center gap-1"><HugeiconsIcon icon={Plus} size={14} /> Crie</span>
            </div>
        </div>
    </div>
  );
}