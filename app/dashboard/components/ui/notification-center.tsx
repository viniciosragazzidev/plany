'use client';

import { useState, useEffect } from "react";
import { Notification01Icon, Tick02Icon, Cancel01Icon, InformationCircleIcon, CheckmarkCircle02Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getNotifications, markAsRead, markAllAsRead } from "@/lib/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: Date;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
        const response = await getNotifications();
        if (mounted && response.success && response.notifications) {
            setNotifications(response.notifications as Notification[]);
            setUnreadCount((response.notifications as Notification[]).filter((n) => !n.isRead).length);
        }
    };

    fetchData();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    return () => {
        mounted = false;
        clearInterval(interval);
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-green-500" />;
      case "warning": return <HugeiconsIcon icon={AlertCircleIcon} size={16} className="text-yellow-500" />;
      case "error": return <HugeiconsIcon icon={Cancel01Icon} size={16} className="text-red-500" />;
      default: return <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-blue-500" />;
    }
  };

  const handleFetchOnOpen = (open: boolean) => {
    if (open) {
        getNotifications().then(response => {
            if (response.success && response.notifications) {
                setNotifications(response.notifications as Notification[]);
                setUnreadCount((response.notifications as Notification[]).filter((n) => !n.isRead).length);
            }
        });
    }
  };

  return (
    <DropdownMenu onOpenChange={handleFetchOnOpen}>
      <DropdownMenuTrigger render={
        <Button variant="ghost" size="icon-sm" className="rounded-xl h-9 w-9 relative">
          <HugeiconsIcon icon={Notification01Icon} size={18} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background" />
          )}
        </Button>
      } />
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="p-4 flex items-center justify-between">
          <span className="text-sm font-bold">Notificações</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="xs" onClick={handleMarkAllAsRead} className="text-[10px] h-6 px-2 gap-1">
              <HugeiconsIcon icon={Tick02Icon} size={12} />
              Ler tudo
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
              <HugeiconsIcon icon={Notification01Icon} size={32} className="opacity-20" />
              <p className="text-xs">Nenhuma notificação por enquanto</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-4 border-b border-border/50 hover:bg-secondary/20 transition-colors flex gap-3 relative",
                    !n.isRead && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs truncate">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                      {n.message}
                    </p>
                    {n.link && (
                      <Link 
                        href={n.link} 
                        onClick={() => handleMarkAsRead(n.id)}
                        className="text-[10px] text-primary font-medium hover:underline mt-1"
                      >
                        Ver detalhes
                      </Link>
                    )}
                  </div>
                  {!n.isRead && (
                    <div className="absolute top-4 right-2 w-1.5 h-1.5 bg-primary rounded-full" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
