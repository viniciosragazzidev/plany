"use client";

import dynamic from "next/dynamic";

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

export const Editor = dynamic<EditorProps>(() => import("./editor-client"), { 
  ssr: false,
  loading: () => <div className="w-full h-[400px] animate-pulse bg-muted rounded-md" />
});
