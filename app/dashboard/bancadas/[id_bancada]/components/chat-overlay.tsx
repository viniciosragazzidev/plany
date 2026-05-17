'use client'

import { useChatOverlay } from "@/hooks/use-chat-overlay";
import { ChatBench } from "./chat-bench";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  Message01Icon
} from "@hugeicons/core-free-icons";
import { motion, AnimatePresence } from "framer-motion";

export function ChatOverlay() {
  const { isOpen, isMaximized, openChat } = useChatOverlay();

  return (
    <>
      {/* Floating Trigger Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60]"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Container Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className={cn(
            "fixed inset-0 z-50 flex justify-center px-4 md:px-0",
            isMaximized ? "items-start pt-8 pb-0" : "items-end pb-8"
          )}>
            {/* Backdrop for Maximized Mode */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
              onClick={(e) => {
                // Clicking outside closes or minimizes?
                // For now, let's leave it as just a backdrop
              }}
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ 
                type: "spring", 
                damping: 25, 
                stiffness: 300,
                delay: 0.1 // Slight delay after backdrop
              }}
              className={cn(
                "w-full bg-background pointer-events-auto origin-bottom relative overflow-hidden",
                isMaximized 
                  ? "h-[calc(100dvh-40px)] w-[calc(100vw-40px)] max-w-7xl mb-5 rounded-3xl shadow-2xl border border-border/50" 
                  : "h-[80vh] max-w-4xl rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-border/50"
              )}
            >
               <ChatBench />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
