import * as React from "react"
import { cn } from "@/lib/utils"

export interface SegmentedTabOption {
  value: string
  label: string
  count?: number
}

interface SegmentedTabsProps {
  value: string
  onValueChange: (value: string) => void
  options: SegmentedTabOption[]
  className?: string
}

export function SegmentedTabs({
  value,
  onValueChange,
  options,
  className,
}: SegmentedTabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-lg bg-muted p-1",
        className
      )}
    >
      {options.map((option) => {
        const isActive = value === option.value
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "tabular-nums rounded-full px-1.5 py-0.5 text-xs leading-none",
                  isActive
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted/60 text-muted-foreground"
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
