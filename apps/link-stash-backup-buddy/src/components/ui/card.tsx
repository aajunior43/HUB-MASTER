import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, onPointerMove, onPointerLeave, style, ...props }, ref) => {
  const localRef = React.useRef<HTMLDivElement>(null)

  const setRefs = React.useCallback((node: HTMLDivElement | null) => {
    localRef.current = node

    if (typeof ref === "function") {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }, [ref])

  const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const element = localRef.current
    if (element) {
      const rect = element.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      element.style.setProperty("--x", `${x.toFixed(2)}px`)
      element.style.setProperty("--y", `${y.toFixed(2)}px`)
      element.style.setProperty("--xp", (x / rect.width).toFixed(3))
      element.style.setProperty("--yp", (y / rect.height).toFixed(3))
    }

    onPointerMove?.(event)
  }, [onPointerMove])

  const handlePointerLeave = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const element = localRef.current
    if (element) {
      element.style.setProperty("--x", "50%")
      element.style.setProperty("--y", "50%")
      element.style.setProperty("--xp", "0.5")
      element.style.setProperty("--yp", "0.5")
    }

    onPointerLeave?.(event)
  }, [onPointerLeave])

  return (
    <div
      ref={setRefs}
      data-glow-card
      style={{
        "--base": 42,
        "--spread": 60,
        "--glow-border": 1,
        "--size": 300,
        "--hue": "calc(var(--base) + (var(--xp, 0.5) * var(--spread, 0)))",
        "--x": "50%",
        "--y": "50%",
        "--xp": "0.5",
        "--yp": "0.5",
        ...style,
      } as React.CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "glow-card rounded-2xl border border-border/30 bg-card text-card-foreground shadow-neo",
        className
      )}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-black leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground font-medium", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
