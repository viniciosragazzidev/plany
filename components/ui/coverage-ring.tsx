'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

interface CoverageRingProps {
  progress: number // 0 to 100
  size?: number
  strokeWidth?: number
  className?: string
  color?: string
}

export function CoverageRing({
  progress,
  size = 24,
  strokeWidth = 2,
  className,
  color = "currentColor"
}: CoverageRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted/20"
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      {/* Percentage (optional, hidden for small sizes) */}
      {size > 30 && (
        <span className="absolute text-[8px] font-bold">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  )
}
