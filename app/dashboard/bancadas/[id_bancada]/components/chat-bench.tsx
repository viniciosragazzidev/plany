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
import ReactMarkdown from "react-markdown";
import { TypewriterMarkdown } from "./typewriter-markdown";
import { useBench } from "./bench-context";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBench() {
  const params = useParams();
  const benchId = params.id_bancada as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { selectedContextSubjects } = useBench();

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou seu tutor acadêmico. Como posso ajudar nos seus estudos hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const LOADING_MESSAGES = [
    "Consultando seus materiais...",
    "Preparando uma explicação clara...",
    "Buscando as melhores referências...",
    "Quase lá...",
    "Organizando as ideias..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

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
          selectedSubjectIds: selectedContextSubjects,
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
    <div className="flex flex-col h-full flex-1 bg-background relative overflow-hidden font-sans">
      {/* Chat Header */}
      <div className="p-6 border-b border-border/50 flex justify-between items-center bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <HugeiconsIcon icon={AiChat01Icon} size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold leading-none">Bancada de Conversa</h3>
            <p className="text-xs text-muted-foreground mt-1">Sempre pronto para ensinar</p>
          </div>
        </div>
        
        <Button variant="outline" size="xs" className="rounded-lg gap-1.5 h-8">
          <HugeiconsIcon icon={SparklesIcon} size={14} className="text-primary" />
          Sugestões
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-secondary">
        {messages.map((msg, i) => {
          const isLastMessage = i === messages.length - 1;
          const showTypewriter = isLastMessage && msg.role === 'assistant';

          return (
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
                "p-4 rounded-2xl text-sm leading-relaxed",
                msg.role === 'assistant' ? "bg-secondary/10 text-foreground" : "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              )}>
                {msg.role === 'assistant' ? (
                  showTypewriter ? (
                    <TypewriterMarkdown 
                      content={msg.content} 
                      speed={5} 
                      className="prose prose-sm dark:prose-invert max-w-none 
                        prose-p:leading-relaxed prose-pre:bg-secondary/20 prose-pre:p-3 prose-pre:rounded-xl
                        prose-code:bg-primary/10 prose-code:text-primary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                        prose-strong:text-foreground prose-strong:font-bold
                        prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4
                        prose-li:my-1 prose-a:text-primary prose-a:underline"
                    />
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none 
                        prose-p:leading-relaxed prose-pre:bg-secondary/20 prose-pre:p-3 prose-pre:rounded-xl
                        prose-code:bg-primary/10 prose-code:text-primary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                        prose-strong:text-foreground prose-strong:font-bold
                        prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4
                        prose-li:my-1 prose-a:text-primary prose-a:underline">
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-4 max-w-[85%] animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mt-1 shadow-sm shadow-primary/5">
              <HugeiconsIcon icon={AiChat01Icon} size={16} className="animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl bg-secondary/10 text-muted-foreground text-sm italic flex items-center gap-2">
              <div className="flex gap-1">
                <div className="size-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="size-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="size-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              {LOADING_MESSAGES[loadingMessageIndex]}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-gradient-to-t from-background via-background to-transparent pt-10">
        <div className="max-w-3xl mx-auto w-full space-y-4">
          {selectedContextSubjects.length > 0 && (
            <div className="flex justify-center">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1.5 py-1 px-3 rounded-full text-[10px] font-bold animate-in fade-in zoom-in duration-300">
                <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                Usando {selectedContextSubjects.length} {selectedContextSubjects.length === 1 ? 'matéria' : 'matérias'} como contexto
              </Badge>
            </div>
          )}
          
          <div className="relative group">
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
        </div>
        <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
          <HugeiconsIcon icon={InformationCircleIcon} size={12} />
          Plany AI pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </div>
  );
}
