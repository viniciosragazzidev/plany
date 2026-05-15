"use client";

import { useCadernos } from "@/hooks/use-cadernos";
import { AnotacaoEditor } from "../components/anotacao-editor";
import { use, useEffect } from "react";
import { notFound } from "next/navigation";

export default function AnotacaoPage({
  params,
}: {
  params: Promise<{ id_anotacao: string }>;
}) {
  const { id_anotacao } = use(params);
  const { anotacoes, setActiveAnotacao } = useCadernos();

  const anotacao = anotacoes.find((a) => a.id === id_anotacao);

  useEffect(() => {
    if (id_anotacao) {
      setActiveAnotacao(id_anotacao);
    }
  }, [id_anotacao, setActiveAnotacao]);

  if (!anotacao) {
    // During hydration or if just created, it might not be in the list yet
    // but the provider should have it.
    // Let's show a loading state if not found locally yet, 
    // but usually it's there because of layout fetching.
    return (
        <div className="flex-1 flex flex-col items-center justify-center h-full space-y-4 animate-pulse">
            <div className="h-8 w-64 bg-muted rounded" />
            <div className="h-[400px] w-full max-w-4xl bg-muted rounded" />
        </div>
    );
  }

  return (
    <AnotacaoEditor
      anotacao={{
        id: anotacao.id,
        title: anotacao.title || "Sem título",
        content: anotacao.content,
      }}
    />
  );
}
