"use client";

import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export function PercentInput({ label, hint, ...props }: Props) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="font-medium">{label}</span>}
      <input
        {...props}
        type="text"
        inputMode="decimal"
        className={`border rounded px-3 py-2 bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 placeholder:text-zinc-400 ${props.className || ""}`}
        onChange={(e) => {
          // Permitir números, vírgula, ponto, sinais e espaços; normalizar múltiplas vírgulas/pontos
          const v = e.target.value
            .replace(/[^0-9.,\-+\s]/g, "")
            .replace(/\s+/g, " ");
          props.onChange?.({ ...e, target: { ...e.target, value: v } } as any);
        }}
        aria-describedby={hint ? `${props.name}-hint` : undefined}
      />
      {hint && (
        <span id={`${props.name}-hint`} className="text-xs text-zinc-500">
          {hint}
        </span>
      )}
    </label>
  );
}