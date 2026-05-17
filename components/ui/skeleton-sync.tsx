'use client'

import { cn } from "@/lib/utils"

export function SkeletonSync() {
  return (
    <div className="space-y-2.5 animate-in fade-in duration-500 max-w-[400px]">
      {/* Paragraph Skeleton - More compact for 2026 UX */}
      <div className="h-3.5 w-full bg-secondary/15 rounded-md animate-pulse" style={{ animationDelay: '100ms' }} />
      <div className="h-3.5 w-[90%] bg-secondary/10 rounded-md animate-pulse" style={{ animationDelay: '200ms' }} />
      <div className="h-3.5 w-[60%] bg-secondary/5 rounded-md animate-pulse" style={{ animationDelay: '300ms' }} />
    </div>
  )
}
