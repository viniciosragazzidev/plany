'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BenchContextType {
  selectedContextSubjects: string[];
  setSelectedContextSubjects: (subjects: string[]) => void;
  toggleContextSubject: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  // Background Research
  isGlobalResearching: boolean;
  researchStatus: string;
  researchResults: any[];
  startBackgroundResearch: () => Promise<void>;
  clearResearchResults: () => void;
}

const BenchContext = createContext<BenchContextType | undefined>(undefined);

import { performWebResearch } from "@/lib/actions/bench";
import { toast } from "sonner";

export function BenchProvider({ 
    children, 
    initialSubjects,
    benchId,
    initialResearchStatus = "idle"
}: { 
    children: React.ReactNode; 
    initialSubjects: string[];
    benchId: string;
    initialResearchStatus?: string;
}) {
  const [selectedContextSubjects, setSelectedContextSubjects] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
        const saved = localStorage.getItem(`plany_selected_subjects_${benchId}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed.filter(id => initialSubjects.includes(id));
                }
            } catch (e) {
                console.error("Erro ao carregar estados do switch:", e);
            }
        }
    }
    return initialSubjects;
  });
  const [isGlobalResearching, setIsGlobalResearching] = useState(initialResearchStatus === "researching");
  const [researchStatus, setResearchStatus] = useState(initialResearchStatus === "researching" ? "Pesquisando em segundo plano..." : "");
  const [researchResults, setResearchResults] = useState<any[]>([]);

  // Persistence: Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(`plany_selected_subjects_${benchId}`, JSON.stringify(selectedContextSubjects));
  }, [selectedContextSubjects, benchId]);

  const startBackgroundResearch = async () => {
    if (selectedContextSubjects.length === 0) {
      toast.error("Selecione disciplinas no contexto para garimpar.");
      return;
    }

    setIsGlobalResearching(true);
    setResearchStatus("Iniciando garimpo em segundo plano...");
    setResearchResults([]);
    
    // Notification for start
    toast.info("Garimpo Digital iniciado em segundo plano. Você pode continuar seus estudos!", {
        duration: 5000,
    });

    try {
      setResearchStatus("IA analisando tópicos selecionados...");
      const response = await performWebResearch(benchId, selectedContextSubjects, 5);

      if (response.success) {
        setResearchResults(response.results || []);
        // Final notification via Sonner as requested
        toast.success(`Garimpo concluído! ${response.results?.length || 0} novos materiais encontrados.`, {
            duration: 8000,
        });
      } else {
        toast.error(response.error || "Erro no garimpo");
      }
    } catch (error) {
      console.error(error);
      toast.error("Falha no garimpo digital.");
    } finally {
      setIsGlobalResearching(false);
      setResearchStatus("");
    }
  };

  const toggleContextSubject = (id: string) => {
    setSelectedContextSubjects(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const selectAll = (ids: string[]) => {
    setSelectedContextSubjects(ids);
  };

  const deselectAll = () => {
    setSelectedContextSubjects([]);
  };

  const clearResearchResults = () => {
    setResearchResults([]);
  };

  return (
    <BenchContext.Provider value={{ 
      selectedContextSubjects, 
      setSelectedContextSubjects, 
      toggleContextSubject,
      selectAll,
      deselectAll,
      isGlobalResearching,
      researchStatus,
      researchResults,
      startBackgroundResearch,
      clearResearchResults
    }}>
      {children}
    </BenchContext.Provider>
  );
}

export function useBench() {
  const context = useContext(BenchContext);
  if (context === undefined) {
    throw new Error('useBench must be used within a BenchProvider');
  }
  return context;
}
