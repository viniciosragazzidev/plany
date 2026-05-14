'use client'

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BenchContextType {
  selectedContextSubjects: string[];
  setSelectedContextSubjects: (subjects: string[]) => void;
  toggleContextSubject: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
}

const BenchContext = createContext<BenchContextType | undefined>(undefined);

export function BenchProvider({ 
    children, 
    initialSubjects 
}: { 
    children: React.ReactNode; 
    initialSubjects: string[] 
}) {
  const [selectedContextSubjects, setSelectedContextSubjects] = useState<string[]>(initialSubjects);

  // Sync with initial subjects if they change (e.g. new subjects added)
  useEffect(() => {
    // We only want to add new subjects to the selection by default, not reset it
    setSelectedContextSubjects(prev => {
        const newOnes = initialSubjects.filter(id => !prev.includes(id));
        if (newOnes.length === 0) return prev;
        return [...prev, ...newOnes];
    });
  }, [initialSubjects]);

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

  return (
    <BenchContext.Provider value={{ 
      selectedContextSubjects, 
      setSelectedContextSubjects, 
      toggleContextSubject,
      selectAll,
      deselectAll
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
