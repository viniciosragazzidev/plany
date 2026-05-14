'use client'

import { useState, useEffect } from 'react'
import { Card } from "@/components/ui/card"
import { HugeiconsIcon } from "@hugeicons/react"
import { Yoga01Icon, Coffee01Icon, ZapIcon, Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

const TIPS = [
  {
    text: "Estudos intensos pedem pausas. Use a técnica Pomodoro: 25min de foco e 5min de descanso.",
    icon: Yoga01Icon,
    color: "text-primary"
  },
  {
    text: "Hidrate-se! Beber água ajuda na concentração e evita o cansaço mental precoce.",
    icon: Coffee01Icon,
    color: "text-blue-500"
  },
  {
    text: "Você está progredindo! Cada tópico estudado é um passo mais próximo do seu objetivo.",
    icon: ZapIcon,
    color: "text-amber-500"
  },
  {
    text: "O sono é parte do estudo. É durante o descanso que o cérebro consolida o que foi aprendido.",
    icon: Moon02Icon,
    color: "text-indigo-500"
  },
  {
    text: "Comece pelo mais difícil enquanto sua energia está alta. O resto fluirá melhor.",
    icon: Sun03Icon,
    color: "text-orange-500"
  }
]

export function MotivationalWidget() {
  const [tipIndex, setTipIndex] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTipIndex(Math.floor(Math.random() * TIPS.length))
    
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % TIPS.length)
    }, 1000 * 60 * 15) // Change every 15 minutes

    return () => clearInterval(interval)
  }, [])

  if (!mounted) return null

  const currentTip = TIPS[tipIndex]

  return (
    <Card className="p-4 rounded-2xl border-primary/20 bg-primary/5 space-y-3 relative overflow-hidden group animate-in fade-in duration-700">
      <HugeiconsIcon 
        icon={currentTip.icon} 
        size={40} 
        className={cn("absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform duration-500", currentTip.color)} 
      />
      <div className={cn("flex items-center gap-2 font-bold", currentTip.color)}>
        <HugeiconsIcon icon={currentTip.icon} size={16} />
        <span className="text-sm">Dica de Bem-estar</span>
      </div>
      <p className="text-xs leading-relaxed text-foreground/80 relative z-10 transition-all">
        {currentTip.text}
      </p>
    </Card>
  )
}
