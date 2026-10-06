/**
 * Rodapé místico egípcio — filete dourado + assinatura.
 */
export default function EgyptFooter() {
  return (
    <footer className="relative z-30 mt-auto w-full py-4">
      {/* filete dourado ornamental */}
      <div
        aria-hidden
        className="mx-auto mb-3 h-px w-full max-w-3xl"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.55) 20%, hsl(var(--primary-glow) / 0.9) 50%, hsl(var(--primary) / 0.55) 80%, transparent 100%)",
          boxShadow: "0 0 12px hsl(var(--primary) / 0.35)",
        }}
      />
      <div className="flex items-center justify-center gap-3">
        <span aria-hidden className="text-sm text-primary/50">𓂀</span>
        <span
          className="font-display uppercase tracking-[0.32em] text-[11px] sm:text-xs"
          style={{
            background:
              "linear-gradient(180deg, hsl(var(--primary-glow)) 0%, hsl(var(--primary)) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          DEV · Aleksandro Alves
        </span>
        <span aria-hidden className="text-sm text-primary/50">𓋹</span>
      </div>
    </footer>
  );
}
