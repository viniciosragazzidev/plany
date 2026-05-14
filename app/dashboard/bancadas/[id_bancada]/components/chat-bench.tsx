'use client'

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { 
  SentIcon, 
  AiChat01Icon, 
  UserIcon,
  SparklesIcon,
  InformationCircleIcon
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBench() {
  const params = useParams();
  const benchId = params.id_bancada as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou seu tutor acadêmico. Como posso ajudar nos seus estudos hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          benchId: benchId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Erro na resposta da IA");
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      
      // Real-time feedback toast
      if (data.content.length > 200) {
        toast.info("Tutor Plany", {
          description: "Essa explicação é um pouco mais detalhada. Faça uma pausa se precisar!",
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao conectar com a IA. Verifique sua conexão.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 bg-background relative overflow-hidden">
      {/* Chat Header */}
      <div className="p-6 border-b border-border/50 flex justify-between items-center bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <HugeiconsIcon icon={AiChat01Icon} size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-none">Bancada de Conversa</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Sempre pronto para ensinar</p>
          </div>
        </div>
        
        <Button variant="outline" size="xs" className="rounded-lg gap-1.5 h-8">
          <HugeiconsIcon icon={SparklesIcon} size={14} className="text-primary" />
          Sugestões
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-secondary">
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-300",
            msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
          )}>
            <div className={cn(
              "w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-1",
              msg.role === 'assistant' ? "bg-primary/10 text-primary" : "bg-secondary/20 text-muted-foreground"
            )}>
              <HugeiconsIcon icon={msg.role === 'assistant' ? AiChat01Icon : UserIcon} size={16} />
            </div>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
              msg.role === 'assistant' ? "bg-secondary/10 text-foreground" : "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 max-w-[85%] animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mt-1">
              <HugeiconsIcon icon={AiChat01Icon} size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-secondary/10 text-muted-foreground text-xs italic">
              Plany está pensando...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-gradient-to-t from-background via-background to-transparent pt-10">
        <div className="relative max-w-3xl mx-auto w-full group">
          <Input 
            placeholder="Pergunte sobre seus materiais..."
            className="h-14 pl-6 pr-16 rounded-2xl bg-secondary/10 border-border/50 focus:bg-background transition-all shadow-sm group-focus-within:shadow-xl group-focus-within:shadow-primary/5"
            value={input}
            disabled={isLoading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button 
            size="icon-sm" 
            className="absolute right-2.5 top-2.5 rounded-xl h-9 w-9"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
            ) : (
              <HugeiconsIcon icon={SentIcon} size={18} />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
          <HugeiconsIcon icon={InformationCircleIcon} size={12} />
          Plany AI pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </div>
  );
}
