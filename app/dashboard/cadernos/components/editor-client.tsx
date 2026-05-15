"use client";

import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

export default function Editor({ initialContent, onChange }: EditorProps) {
  return <SimpleEditor initialContent={initialContent} onChange={onChange} />;
}
