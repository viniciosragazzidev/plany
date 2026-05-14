'use client'

import { cn } from "@/lib/utils"

export function SkeletonSync() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* Title Skeleton */}
      <div className="h-6 w-3/4 bg-secondary/20 rounded-lg animate-pulse" />
      
      {/* Paragraph Skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-full bg-secondary/10 rounded-md animate-pulse" style={{ animationDelay: '100ms' }} />
        <div className="h-3 w-[90%] bg-secondary/10 rounded-md animate-pulse" style={{ animationDelay: '200ms' }} />
        <div className="h-3 w-[95%] bg-secondary/10 rounded-md animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Bullet Points Skeleton */}
      <div className="space-y-3 pl-4">
        <div className="flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-primary/20 animate-pulse" />
          <div className="h-3 w-1/2 bg-secondary/10 rounded-md animate-pulse" style={{ animationDelay: '400ms' }} />
        </div>
        <div className="flex items-center gap-2">
          <div className="size-1.5 rounded-full bg-primary/20 animate-pulse" />
          <div className="h-3 w-2/3 bg-secondary/10 rounded-md animate-pulse" style={{ animationDelay: '500ms' }} />
        </div>
      </div>

      {/* Code Block Skeleton */}
      <div className="p-4 bg-secondary/5 rounded-xl border border-border/50 space-y-2">
        <div className="h-2 w-1/4 bg-primary/10 rounded animate-pulse" />
        <div className="h-2 w-3/4 bg-secondary/10 rounded animate-pulse" />
      </div>
    </div>
  )
}
