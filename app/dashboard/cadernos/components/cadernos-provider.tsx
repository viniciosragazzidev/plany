'use client'

import { useEffect, useRef } from 'react';
import { useCadernos } from '@/hooks/use-cadernos';

export function CadernosProvider({ 
  children, 
  initialBenches, 
  initialAnotacoes 
}: { 
  children: React.ReactNode, 
  initialBenches: any[], 
  initialAnotacoes: any[] 
}) {
  const isInitialized = useRef(false);
  const setInitialData = useCadernos((state) => state.setInitialData);

  useEffect(() => {
    if (!isInitialized.current) {
      setInitialData(initialBenches, initialAnotacoes);
      isInitialized.current = true;
    }
  }, [initialBenches, initialAnotacoes, setInitialData]);

  return <>{children}</>;
}