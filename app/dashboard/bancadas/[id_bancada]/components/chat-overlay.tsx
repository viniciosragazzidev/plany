'use client'

import { useChatOverlay } from "@/hooks/use-chat-overlay";
import { ChatBench } from "./chat-bench";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Message01Icon
} from "@hugeicons/core-free-icons";

export function ChatOverlay() {
  const { isOpen, isMaximized, openChat } = useChatOverlay();

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-60 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              openChat();
            }}
            className="rounded-full px-6 h-14 bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/40 border border-white/10 backdrop-blur-md flex items-center gap-3 group transition-all active:scale-95 cursor-pointer"
          >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 pointer-events-none">
                <HugeiconsIcon icon={Message01Icon} size={18} />
            </div>
            <span className="font-bold tracking-tight text-sm pointer-events-none">💬 Perguntar à IA da Bancada</span>
          </Button>
        </div>
      )}

      {/* Chat Container Overlay */}
      <div className={cn(
        "fixed inset-0 transition-all duration-500 ease-in-out flex justify-center px-4 md:px-0",
        isOpen ? "opacity-100 pointer-events-auto z-50 translate-y-0" : "opacity-0 pointer-events-none z-0 translate-y-12",
        isOpen && isMaximized ? "items-start pt-8 pb-0" : "items-end pb-8"
      )}>
        {/* Backdrop for Maximized Mode */}
        <div className={cn(
            "absolute inset-0 bg-background/80 backdrop-blur-md transition-all duration-700",
            isOpen && isMaximized ? "opacity-100 visible" : "opacity-0 invisible"
        )} />

        <div className={cn(
          "w-full bg-background transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) pointer-events-auto origin-bottom relative",
          isOpen 
            ? "translate-y-0 scale-100 rotate-0 opacity-100 animate-in fade-in slide-in-from-bottom-4"
            : "translate-y-20 scale-95 rotate-1 opacity-0",
          isMaximized && isOpen ? "translate-y-5" : "",
          isMaximized 
            ? "h-[calc(100dvh-40px)] w-[calc(100vw-40px)] max-w-7xl mb-5 rounded-3xl shadow-2xl border border-border/50" 
            : "h-[80vh] max-w-4xl rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-border/50"
        )}>
           <ChatBench />
        </div>
      </div>
    </>
  );
}
