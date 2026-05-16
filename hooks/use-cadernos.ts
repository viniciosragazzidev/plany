import { create } from 'zustand';

interface Anotacao {
    id: string;
    benchId: string;
    subjectId: string | null;
    title: string;
    content: string | null;
    updatedAt?: Date;
}

interface Subject {
    id: string;
    benchId: string;
    title: string;
    colorTag: string;
    icon?: string | null;
}

interface Bench {
    id: string;
    goalName: string;
    subjects: Subject[];
}

interface CadernosState {
    benches: Bench[];
    anotacoes: Anotacao[];
    activeAnotacaoId: string | null;
    searchQuery: string;
    setInitialData: (benches: Bench[], anotacoes: Anotacao[]) => void;
    setActiveAnotacao: (id: string | null) => void;
    setSearchQuery: (query: string) => void;
    addBenchLocal: (bench: Bench) => void;
    addAnotacao: (anotacao: Anotacao) => void;
    updateAnotacaoLocal: (id: string, updates: Partial<Anotacao>) => void;
    replaceAnotacaoId: (oldId: string, newId: string) => void;
    deleteAnotacaoLocal: (id: string) => void;
}

export const useCadernos = create<CadernosState>((set) => ({
    benches: [],
    anotacoes: [],
    activeAnotacaoId: null,
    searchQuery: "",
    
    setInitialData: (benches, anotacoes) => set({ benches, anotacoes }),
    
    setActiveAnotacao: (id) => set({ activeAnotacaoId: id }),
    
    setSearchQuery: (query) => set({ searchQuery: query }),
    
    addBenchLocal: (bench: Bench) => set((state) => ({
        benches: [...state.benches, bench]
    })),
    
    addAnotacao: (anotacao) => set((state) => ({ 
        anotacoes: [anotacao, ...state.anotacoes],
        activeAnotacaoId: anotacao.id
    })),
    
    updateAnotacaoLocal: (id, updates) => set((state) => ({
        anotacoes: state.anotacoes.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a)
    })),

    replaceAnotacaoId: (oldId, newId) => set((state) => ({
        anotacoes: state.anotacoes.map(a => a.id === oldId ? { ...a, id: newId } : a),
        activeAnotacaoId: state.activeAnotacaoId === oldId ? newId : state.activeAnotacaoId
    })),

    deleteAnotacaoLocal: (id) => set((state) => ({
        anotacoes: state.anotacoes.filter(a => a.id !== id),
        activeAnotacaoId: state.activeAnotacaoId === id ? null : state.activeAnotacaoId
    })),
}));