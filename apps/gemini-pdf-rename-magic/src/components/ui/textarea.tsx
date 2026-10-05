
import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base minimal textarea styling - consistent with Input
          "flex min-h-[80px] w-full rounded-lg border border-border/40 bg-transparent px-3 py-2",
          // Typography - refined for minimalist design
          "text-sm font-normal leading-relaxed text-high-contrast",
          // Placeholder styling
          "placeholder:text-muted-foreground/70 placeholder:font-normal",
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
          // Resize behavior
          "resize-y",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
