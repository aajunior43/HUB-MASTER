export interface UrlValidationResult {
  isValid: boolean;
  error?: string;
  normalizedUrl?: string;
}

export const validateAndNormalizeUrl = (url: string): UrlValidationResult => {
  if (!url || url.trim() === '') {
    return {
      isValid: false,
      error: 'URL é obrigatória'
    };
  }

  const trimmedUrl = url.trim();

  // Lista de protocolos válidos
  const validProtocols = ['http:', 'https:', 'ftp:', 'mailto:', 'tel:'];
  
  // Verificar se já tem protocolo
  let normalizedUrl = trimmedUrl;
  
  try {
    // Tentar criar URL object para validar
    if (!trimmedUrl.includes('://')) {
      // Se não tem protocolo, adicionar https://
      normalizedUrl = `https://${trimmedUrl}`;
    }
    
    const urlObj = new URL(normalizedUrl);
    
    // Verificar se o protocolo é válido
    if (!validProtocols.includes(urlObj.protocol)) {
      return {
        isValid: false,
        error: 'Protocolo não suportado. Use http, https, ftp, mailto ou tel'
      };
    }
    
    // Validações específicas por protocolo
    if (urlObj.protocol === 'mailto:') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const email = urlObj.pathname;
      if (!emailRegex.test(email)) {
        return {
          isValid: false,
          error: 'Formato de email inválido'
        };
      }
    } else if (urlObj.protocol === 'tel:') {
      const phoneRegex = /^[+]?[0-9\s\-()]+$/;
      const phone = urlObj.pathname;
      if (!phoneRegex.test(phone)) {
        return {
          isValid: false,
          error: 'Formato de telefone inválido'
        };
      }
    } else {
      // Para http/https/ftp, verificar se tem hostname válido
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        return {
          isValid: false,
          error: 'URL deve ter um domínio válido'
        };
      }
      
      // Verificar se o hostname tem pelo menos um ponto (exceto localhost)
      if (!urlObj.hostname.includes('.') && urlObj.hostname !== 'localhost') {
        return {
          isValid: false,
          error: 'Domínio deve ser válido (ex: exemplo.com)'
        };
      }
    }
    
    return {
      isValid: true,
      normalizedUrl: urlObj.toString()
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: 'URL inválida. Verifique o formato'
    };
  }
};

export const getUrlDisplayText = (url: string): string => {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.protocol === 'mailto:') {
      return urlObj.pathname;
    }
    
    if (urlObj.protocol === 'tel:') {
      return urlObj.pathname;
    }
    
    // Para outros protocolos, remover protocolo e www
    let display = urlObj.hostname + urlObj.pathname;
    if (display.startsWith('www.')) {
      display = display.substring(4);
    }
    
    // Adicionar query params se existirem
    if (urlObj.search) {
      display += urlObj.search;
    }
    
    return display;
  } catch {
    return url;
  }
};