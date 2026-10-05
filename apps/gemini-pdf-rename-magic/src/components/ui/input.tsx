import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base minimal input styling
          "flex h-10 w-full rounded-lg border border-border/40 bg-transparent px-3 py-2",
          // Typography - refined for minimalist design
          "text-sm font-normal leading-relaxed text-high-contrast",
          // Placeholder styling
          "placeholder:text-muted-foreground/70 placeholder:font-normal",
          // File input styling
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Focus states - more discrete
          "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/20",
          // Transition for smooth interactions
          "transition-all duration-150 ease-out",
          // Hover state - subtle feedback
          "hover:border-border/60",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/20",
          // Selection styling
          "selection:bg-primary/20 selection:text-foreground",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// Minimal variant for even more subtle appearance
const MinimalInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Ultra-minimal styling
          "flex h-9 w-full rounded-lg border border-border/30 bg-transparent px-3 py-2",
          // Refined typography
          "text-sm font-normal text-high-contrast",
          // Subtle placeholder
          "placeholder:text-muted-foreground/60 placeholder:font-light",
          // File input styling
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Very discrete focus
          "focus-visible:outline-none focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/15",
          // Smooth transitions
          "transition-all duration-150 ease-out",
          // Minimal hover
          "hover:border-border/50",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-transparent",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
MinimalInput.displayName = "MinimalInput"

export { Input, MinimalInput }
