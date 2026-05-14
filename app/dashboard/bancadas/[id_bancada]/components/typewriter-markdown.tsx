'use client'

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

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

  useEffect(() => {
    setDisplayedContent('');
    setCurrentIndex(0);
  }, [content]);

  useEffect(() => {
    if (currentIndex < content.length) {
      const timeout = setTimeout(() => {
        setDisplayedContent(prev => prev + content[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, content, speed, onComplete]);

  return (
    <div className={className}>
      <ReactMarkdown>
        {displayedContent}
      </ReactMarkdown>
    </div>
  );
}
