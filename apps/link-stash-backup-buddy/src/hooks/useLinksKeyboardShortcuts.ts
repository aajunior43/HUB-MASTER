import { useEffect } from 'react';

interface Handlers {
  onFocusSearch: () => void;
  onNewLink: () => void;
  onToggleFavorites: () => void;
  onToggleView: () => void;
  onEscape: () => void;
}

/**
 * Atalhos globais da página de links.
 * Ctrl/Cmd+K busca, +N novo, +F favoritos, +L trocar view; Esc limpa.
 */
export function useLinksKeyboardShortcuts(h: Handlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'k': e.preventDefault(); h.onFocusSearch(); return;
          case 'n': e.preventDefault(); h.onNewLink(); return;
          case 'f': e.preventDefault(); h.onToggleFavorites(); return;
          case 'l': e.preventDefault(); h.onToggleView(); return;
        }
      }
      if (e.key === 'Escape') h.onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
