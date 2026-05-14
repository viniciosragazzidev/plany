'use client'

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { FastForward } from "@hugeicons/core-free-icons";

interface TypewriterMarkdownProps {
  content: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export function TypewriterMarkdown({ 
  content, 
  speed = 5, 
  onComplete,
  className 
}: TypewriterMarkdownProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevContent, setPrevContent] = useState(content);
  const [isFinished, setIsFinished] = useState(false);

  // Reset if content changes
  if (content !== prevContent) {
    setPrevContent(content);
    setDisplayedContent('');
    setCurrentIndex(0);
    setIsFinished(false);
  }

  useEffect(() => {
    if (isFinished) return;

    if (currentIndex < content.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent(prev => prev + content[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      setIsFinished(true);
      if (onComplete) onComplete();
    }
  }, [currentIndex, content, speed, onComplete, isFinished]);

  const handleSkip = () => {
    setDisplayedContent(content);
    setCurrentIndex(content.length);
    setIsFinished(true);
    if (onComplete) onComplete();
  };

  return (
    <div className="relative group/typewriter">
      <div className={className}>
        <ReactMarkdown>
          {displayedContent}
        </ReactMarkdown>
      </div>
      {!isFinished && displayedContent.length > 50 && (
        <Button 
          variant="ghost" 
          size="xs" 
          className="absolute -bottom-6 right-0 text-[10px] h-6 px-2 opacity-0 group-hover/typewriter:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
          onClick={handleSkip}
        >
          <HugeiconsIcon icon={FastForward} size={10} className="mr-1" />
          Pular para o fim
        </Button>
      )}
    </div>
  );
}
