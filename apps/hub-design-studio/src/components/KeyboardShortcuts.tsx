import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Keyboard } from "lucide-react";

interface Shortcut {
  key: string;
  description: string;
  combination: string;
}

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts: Shortcut[] = [
  {
    key: "Ctrl + N",
    description: "Adicionar novo link",
    combination: "ctrl+n"
  },
  {
    key: "Ctrl + S", 
    description: "Salvar perfil",
    combination: "ctrl+s"
  },
  {
    key: "?",
    description: "Mostrar/ocultar atalhos",
    combination: "?"
  },
  {
    key: "Esc",
    description: "Fechar atalhos",
    combination: "escape"
  }
];

export const KeyboardShortcuts = ({ isOpen, onClose }: KeyboardShortcutsProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="p-6 max-w-md w-full mx-4 glass border-border/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Atalhos de Teclado</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.combination}
              className="flex items-center justify-between py-2"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <kbd className="px-2 py-1 text-xs font-mono bg-secondary border border-border rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center">
            Pressione <kbd className="px-1 py-0.5 text-xs font-mono bg-secondary border border-border rounded">?</kbd> para mostrar/ocultar estes atalhos
          </p>
        </div>
      </Card>
    </div>
  );
};