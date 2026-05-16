'use client'

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { useBench } from './bench-context';

interface ClickableMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Enhanced Markdown renderer that identifies technical terms from the edital
 * and transforms them into clickable links that trigger AI explanations.
 */
export function ClickableMarkdown({ content, className }: ClickableMarkdownProps) {
  const { editalItems, setExternalMessage } = useBench();

  // Pre-process content to wrap technical terms in a custom clickable link syntax
  const processedContent = React.useMemo(() => {
    if (!editalItems || editalItems.length === 0 || !content) return content;

    // Filter and sort items: prioritizing longer terms to avoid partial matches within longer words
    const terms = editalItems
      .filter(i => i.topic && i.topic.length > 3)
      .sort((a, b) => b.topic.length - a.topic.length);

    if (terms.length === 0) return content;

    let result = content;

    // To prevent matching terms inside URLs or existing Markdown links, 
    // we use a strategy to identify terms only in "safe" areas.
    // For simplicity in this implementation, we use a regex with basic boundaries.
    
    // Create a unique marker for terms to avoid recursive replacement
    const termMap = new Map<string, { topic: string; category: string }>();
    
    terms.forEach((item, index) => {
      const marker = `__CLICKABLE_TERM_${index}__`;
      const escapedTopic = item.topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Boundaries to ensure we match whole words and not already processed markers or links
      // We look for word boundaries and ensure it's not preceded by [ or followed by ](
      const regex = new RegExp(`\\b(${escapedTopic})\\b`, 'gi');
      
      let matchFound = false;
      result = result.replace(regex, () => {
        // If it's already part of a Markdown link or code block, we might want to skip.
        // For a more robust solution, we'd use a real parser, but this regex covers common cases.
        matchFound = true;
        return marker;
      });

      if (matchFound) {
        termMap.set(marker, { topic: item.topic, category: item.category });
      }
    });

    // Replace markers with Markdown link syntax that we'll catch in the renderer
    termMap.forEach((data, marker) => {
      result = result.replaceAll(marker, `[${data.topic}](clickable:${encodeURIComponent(data.category)})`);
    });

    return result;
  }, [content, editalItems]);

  const components = {
    // Custom link renderer
    a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      const isClickable = href?.startsWith('clickable:');
      
      if (isClickable && href) {
        const context = decodeURIComponent(href.replace('clickable:', ''));
        const term = React.Children.toArray(children).join('');
        
        return (
          <button
            type="button"
            className="inline-flex items-baseline cursor-pointer border-b border-dotted border-primary/60 hover:border-primary hover:text-primary transition-all font-semibold px-0.5 rounded-sm hover:bg-primary/5 active:scale-95 text-inherit h-auto align-baseline decoration-dotted"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExternalMessage(`No contexto de ${context}, o que significa ${term}?`);
            }}
            title={`Clique para explicar "${term}"`}
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
  };

  return (
    <div className={cn("clickable-markdown-container", className)}>
      <ReactMarkdown components={components as any}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

import { cn } from "@/lib/utils";
