import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface ComboboxInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  strict?: boolean;
}

export const ComboboxInput = ({
  id,
  value,
  onChange,
  options,
  placeholder,
  emptyMessage = "Nenhum item salvo",
  className,
  strict = false,
}: ComboboxInputProps) => {
  const [open, setOpen] = useState(false);

  const filtered = value.trim()
    ? options.filter((o) => o.toLowerCase().includes(value.toLowerCase()))
    : options;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative flex items-center gap-1", className)}>
        <Input
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            if (strict && value.trim() && !options.some((o) => o.toLowerCase() === value.trim().toLowerCase())) {
              onChange("");
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          className="h-11 bg-muted/40 border-border focus-visible:ring-accent pr-10"
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Escolher salvo"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-primary hover:bg-emerald-soft"
          >
            <ChevronsUpDown className="h-4 w-4 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-[260px] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command shouldFilter={false}>
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              {filtered.length > 0 && (
                <CommandGroup>
                  {filtered.map((opt) => (
                    <CommandItem
                      key={opt}
                      value={opt}
                      onSelect={() => {
                        onChange(opt);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          opt === value ? "opacity-100 text-accent" : "opacity-0"
                        )}
                      />
                      {opt}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </div>
    </Popover>
  );
};
