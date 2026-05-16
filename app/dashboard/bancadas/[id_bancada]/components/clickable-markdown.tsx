'use client'

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useBench } from './bench-context';
import { useParams } from 'next/navigation';

interface ClickableMarkdownProps {
  content: string;
  className?: string;
  isLoading?: boolean;
}

/**
 * Enhanced Markdown renderer that identifies technical terms from the edital
 * and transforms them into clickable links that trigger AI explanations.
 */
export function ClickableMarkdown({ content, className, isLoading }: ClickableMarkdownProps) {
  const { editalItems, setExternalMessage, selectedContextSubjects } = useBench();
  const params = useParams();

  // Pre-process content to wrap technical terms in a custom clickable link syntax
  const processedContent = React.useMemo(() => {
    if (!content) return "";

    let result = content;

    // 1. Proteger blocos de código e links existentes antes do processamento
    const protectedBlocks: string[] = [];
    result = result.replace(/(`[^`]+`|\[[^\]]+\]\([^\)]+\)|```[\s\S]*?```)/g, (match) => {
      const placeholder = `__PROTECTED_BLOCK_${protectedBlocks.length}__`;
      protectedBlocks.push(match);
      return placeholder;
    });

    // 2. Identificar sintaxe explícita [[Termo]] vinda da IA
    const termMap = new Map<string, { topic: string; category: string }>();
    let markerIndex = 0;

    result = result.replace(/\[\[(.*?)\]\]/g, (match, term) => {
        const marker = `__TERM_MARKER_AI_${markerIndex++}__`;
        // Tentamos pegar uma categoria real se possível, senão usamos o assunto da bancada
        termMap.set(marker, { topic: term, category: "Geral" }); 
        return marker;
    });

    // 3. Identificar termos do edital (fallback se editalItems estiver disponível)
    if (editalItems && editalItems.length > 0) {
        const terms = editalItems
          .filter(i => i.topic && i.topic.length > 3)
          .sort((a, b) => b.topic.length - a.topic.length);

        terms.forEach((item) => {
          const escapedTopic = item.topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?<![a-zA-Z0-9_])(${escapedTopic})(?![a-zA-Z0-9_])`, 'gi');
          
          result = result.replace(regex, (match) => {
            if (match.startsWith('__TERM_MARKER')) return match;
            const marker = `__TERM_MARKER_ED_${markerIndex++}__`;
            termMap.set(marker, { topic: match, category: item.category });
            return marker;
          });
        });
    }

    // 4. Transformar marcadores em sintaxe de link customizada
    termMap.forEach((data, marker) => {
      result = result.replaceAll(marker, `[${data.topic}](#explain:${encodeURIComponent(data.category)})`);
    });

    // 5. Restaurar blocos protegidos
    protectedBlocks.forEach((content, index) => {
      result = result.replace(`__PROTECTED_BLOCK_${index}__`, content);
    });

    return result;
  }, [content, editalItems]);

  const components = {
    // Custom link renderer
    a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      const isClickable = href?.includes('#explain:');
      
      if (isClickable && href) {
        const parts = href.split('#explain:');
        const rawCategory = decodeURIComponent(parts[parts.length - 1]);
        const term = React.Children.toArray(children).join('');

        // Se a categoria for "Geral", tentamos inferir algo melhor do contexto local da bancada
        const context = rawCategory === "Geral" ? "este assunto" : rawCategory;
        
        return (
          <button
            type="button"
            disabled={isLoading}
            className={cn(
              "inline-flex items-baseline cursor-pointer border-b border-dotted border-primary/50 text-primary font-bold hover:border-primary transition-all px-0.5 rounded-sm h-auto align-baseline decoration-dotted",
              isLoading ? "opacity-50 cursor-not-allowed border-muted-foreground/30" : "hover:bg-primary/5 active:scale-95"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isLoading) return;
              setExternalMessage(`No contexto de ${context}, o que significa ${term}?`);
            }}
            title={isLoading ? "Aguarde a IA responder..." : `Clique para explicar "${term}"`}
          >
            {children}
          </button>
        );
      }
      
      // Default link behavior
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-primary hover:underline font-medium transition-all"
          {...props}
        >
          {children}
        </a>
      );
    },
    // Ensure paragraphs and lists don't break our inline buttons
    p: ({ children }: { children: React.ReactNode }) => <p className="leading-relaxed mb-4 last:mb-0">{children}</p>,
    ul: ({ children }: { children: React.ReactNode }) => <ul className="list-disc pl-4 space-y-1 mb-4">{children}</ul>,
    ol: ({ children }: { children: React.ReactNode }) => <ol className="list-decimal pl-4 space-y-1 mb-4">{children}</ol>,
    li: ({ children }: { children: React.ReactNode }) => <li className="leading-relaxed">{children}</li>,
    code: ({ children, className }: any) => {
        return (
            <code className={cn("bg-primary/10 text-primary px-1 py-0.5 rounded text-[0.9em]", className)}>
                {children}
            </code>
        )
    }
  };

  return (
    <div className={cn("clickable-markdown-container", className)}>
      <ReactMarkdown 
        components={components as any}
        urlTransform={(url) => url.startsWith('#explain:') ? url : url}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

import { cn } from "@/lib/utils";
