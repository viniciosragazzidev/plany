'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { HugeiconsIcon } from '@hugeicons/react'
import { FireIcon, Coffee01Icon } from '@hugeicons/core-free-icons'

interface SprintManagerProps {
  intervalMinutes?: number;
}

export function SprintManager({ intervalMinutes = 25 }: SprintManagerProps) {
  const [startTime] = useState(Date.now());
  const [lastNotificationTime, setLastNotificationTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMinutes = Math.floor((now - lastNotificationTime) / (1000 * 60));

      if (elapsedMinutes >= intervalMinutes) {
        setLastNotificationTime(now);
        
        toast.info("Você está em chamas! 🔥", {
          description: `Você está estudando há ${Math.floor((now - startTime) / (1000 * 60))} minutos. Que tal um sprint de 5 min de descanso?`,
          action: {
            label: "Pausa rápida",
            onClick: () => window.open('https://www.youtube.com/results?search_query=lofi+hip+hop+radio', '_blank')
          },
          duration: 10000,
          icon: <HugeiconsIcon icon={Coffee01Icon} size={18} className="text-orange-500" />
        });
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [intervalMinutes, lastNotificationTime, startTime]);

  return null;
}
