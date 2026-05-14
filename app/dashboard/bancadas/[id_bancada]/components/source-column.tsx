'use client'

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  SourceCodeIcon, 
  FileUploadIcon, 
  File01Icon, 
  FolderIcon, 
  PlusSignIcon,
  Doc01Icon,
  Link01Icon
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'link' | 'text';
  subjectTitle: string;
}

interface SourceColumnProps {
  materials: Material[];
}

export function SourceColumn({ materials }: SourceColumnProps) {
  return (
    <div className="flex flex-col h-full bg-secondary/5 border-r border-border/50 w-72 shrink-0">
      <div className="p-6 border-b border-border/50 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
          <HugeiconsIcon icon={FolderIcon} size={18} />
          Fontes
        </div>
        <Button variant="ghost" size="icon-xs" className="rounded-lg">
          <HugeiconsIcon icon={PlusSignIcon} size={16} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="p-4 rounded-2xl border-2 border-dashed border-border/50 bg-background/50 flex flex-col items-center justify-center text-center gap-2 group hover:border-primary/50 transition-colors cursor-pointer">
          <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <HugeiconsIcon icon={FileUploadIcon} size={20} />
          </div>
          <div className="space-y-0.5">
            <p className="text-xs font-bold">Adicionar Fontes</p>
            <p className="text-[10px] text-muted-foreground">PDF, Texto ou Links</p>
          </div>
        </div>

        <div className="space-y-2">
          {materials.length > 0 ? (
            materials.map((material) => (
              <Card key={material.id} className="p-3 rounded-xl border border-border/50 bg-background hover:bg-secondary/5 transition-all cursor-pointer group">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    {material.type === 'pdf' && <HugeiconsIcon icon={Doc01Icon} size={16} />}
                    {material.type === 'link' && <HugeiconsIcon icon={Link01Icon} size={16} />}
                    {material.type === 'text' && <HugeiconsIcon icon={File01Icon} size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{material.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{material.subjectTitle}</p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="py-8 text-center space-y-2">
              <p className="text-xs text-muted-foreground italic">Nenhum material ainda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
