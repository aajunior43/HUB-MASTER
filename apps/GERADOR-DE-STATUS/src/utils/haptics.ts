// Utilitários para feedback tátil em dispositivos móveis

export const hapticFeedback = {
  // Vibração leve para interações básicas
  light: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  },

  // Vibração média para ações importantes
  medium: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
  },

  // Vibração forte para confirmações
  strong: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  },

  // Padrão de sucesso
  success: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }
  },

  // Padrão de erro
  error: () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  },

  // Verifica se o dispositivo suporta vibração
  isSupported: () => {
    return 'vibrate' in navigator;
  }
};