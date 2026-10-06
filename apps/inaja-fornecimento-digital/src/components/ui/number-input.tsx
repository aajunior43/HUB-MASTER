import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";

function parseNumero(raw: string): number {
  const s = raw.trim();
  if (!s) return 0;
  const normalizado = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

function formatarValor(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  return String(value);
}

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (value: number) => void;
}

export function NumberInput({ value, onValueChange, ...props }: NumberInputProps) {
  const [text, setText] = useState(() => formatarValor(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(formatarValor(value));
  }, [value]);

  return (
    <Input
      type="text"
      inputMode="decimal"
      {...props}
      value={text}
      onFocus={(e) => {
        focused.current = true;
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        setText(formatarValor(value));
        props.onBlur?.(e);
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,-]/g, "");
        setText(raw);
        onValueChange(parseNumero(raw));
      }}
    />
  );
}
