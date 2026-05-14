'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { Plus, Folder01Icon } from "@hugeicons/core-free-icons";
import { CreateBenchDialog } from "@/components/onboarding/create-bench-dialog";

export function DashboardEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="size-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-6">
        <HugeiconsIcon icon={Folder01Icon} size={40} />
      </div>
      <h2 className="text-2xl font-bold text-center mb-2">Seu Cérebro de Contexto está vazio</h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Suba seu primeiro edital para que o PLANY possa gerar estatísticas, 
        organizar suas matérias e começar a te ajudar a passar no concurso dos seus sonhos.
      </p>
      
      <CreateBenchDialog 
        trigger={
          <Button size="lg" className="rounded-2xl gap-2 px-8">
            Criar Minha Primeira Bancada
            <HugeiconsIcon icon={Plus} size={20} />
          </Button>
        }
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 w-full max-w-4xl">
        {[
          { title: "Suba o Edital", desc: "Processamos o PDF e extraímos os tópicos automaticamente." },
          { title: "Adicione Materiais", desc: "Vetorizamos seus PDFs e links para o chat inteligente." },
          { title: "Acompanhe o Progresso", desc: "Veja seu equilíbrio de conhecimento aqui no dashboard." }
        ].map((step, i) => (
          <Card key={i} className="rounded-3xl border-border/50 bg-secondary/5 border-dashed">
            <CardContent className="pt-6">
              <div className="size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold mb-3">
                {i + 1}
              </div>
              <h3 className="font-bold text-sm mb-1">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
