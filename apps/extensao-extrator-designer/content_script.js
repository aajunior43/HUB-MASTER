// Content script: extrai características de estilo do site atual

(function() {
  function toPxNumber(v) {
    if (!v) return null;
    const m = String(v).match(/(-?\d*\.?\d+)/);
    return m ? Number(m[1]) : null;
  }

  function normalizeColor(value) {
    if (!value) return null;
    const s = value.trim();
    if (s === 'transparent') return null;
    // Already hex
    if (s.startsWith('#')) return s.toLowerCase();
    // rgb/rgba
    const rgba = s.match(/rgba?\(([^)]+)\)/i);
    if (rgba) {
      const parts = rgba[1].split(',').map(p => p.trim());
      const r = Math.max(0, Math.min(255, parseInt(parts[0], 10)));
      const g = Math.max(0, Math.min(255, parseInt(parts[1], 10)));
      const b = Math.max(0, Math.min(255, parseInt(parts[2], 10)));
      const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
      const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
      if (a < 1) return `rgba(${r}, ${g}, ${b}, ${a})`;
      return hex;
    }
    // hsl/hsla
    const hsl = s.match(/hsla?\(([^)]+)\)/i);
    if (hsl) return s; // Keep original if hsl
    return s; // Fallback
  }

  function uniqueSortedNumbers(values) {
    const set = new Set();
    for (const v of values) {
      const n = toPxNumber(v);
      if (n !== null && !Number.isNaN(n)) set.add(Math.round(n));
    }
    return Array.from(set).sort((a, b) => a - b);
  }

  function collectRootCssVariables() {
    try {
      const styles = getComputedStyle(document.documentElement);
      const vars = [];
      for (let i = 0; i < styles.length; i++) {
        const prop = styles.item(i);
        if (prop && prop.startsWith('--')) {
          const val = styles.getPropertyValue(prop).trim();
          if (val) vars.push({ name: prop, value: val });
        }
      }
      return vars;
    } catch (e) {
      return [];
    }
  }

  function sampleElements(limit = 200) {
    // Cache para melhor performance
    if (sampleElements._cache && sampleElements._cacheTime > Date.now() - 5000) {
      return sampleElements._cache;
    }
    
    const body = document.body;
    if (!body) return [];
    
    // Usar seletores mais específicos para elementos relevantes
    const relevantSelectors = [
      'h1, h2, h3, h4, h5, h6',
      'p, span, div',
      'a, button, input, textarea, select',
      'nav, header, footer, main, section, article',
      'ul, ol, li',
      'img, svg',
      '[class*="btn"], [class*="button"]',
      '[class*="card"], [class*="container"]',
      '[class*="nav"], [class*="menu"]'
    ];
    
    const elements = new Set();
    
    // Coletar elementos usando seletores específicos
    for (const selector of relevantSelectors) {
      try {
        const found = body.querySelectorAll(selector);
        for (let i = 0; i < Math.min(found.length, 50); i++) {
          const el = found[i];
          // Filtrar apenas elementos visíveis e com conteúdo relevante
          if (el.offsetParent !== null && 
              (el.offsetWidth > 0 || el.offsetHeight > 0) &&
              !el.closest('script, style, noscript')) {
            elements.add(el);
          }
        }
      } catch (e) {
        console.warn('Erro ao processar seletor:', selector, e);
      }
    }
    
    // Adicionar elementos com classes CSS interessantes
    try {
      const classElements = body.querySelectorAll('[class]');
      for (let i = 0; i < Math.min(classElements.length, 100); i++) {
        const el = classElements[i];
        if (el.offsetParent !== null && el.className.length > 0) {
          elements.add(el);
        }
      }
    } catch (e) {
      console.warn('Erro ao coletar elementos com classes:', e);
    }
    
    const result = Array.from(elements).slice(0, limit);
    
    // Cache do resultado
    sampleElements._cache = result;
    sampleElements._cacheTime = Date.now();
    
    return result;
  }

  function firstExisting(selector) {
    return document.querySelector(selector);
  }

  function getComputedProps(el, props) {
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of props) out[p] = cs.getPropertyValue(p);
    return out;
  }

  function extractTypography() {
    const tags = ['h1','h2','h3','h4','h5','h6','p','a','button','input','label','small','code','blockquote'];
    const result = {};
    for (const tag of tags) {
      const el = firstExisting(tag);
      if (el) {
        const cs = getComputedStyle(el);
        result[tag] = {
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          textTransform: cs.textTransform,
          color: cs.color
        };
      }
    }
    return result;
  }

  function extractLayoutAndDensity(sampled) {
    let flexCount = 0, gridCount = 0;
    const widths = [];
    const maxWidths = [];
    for (const el of sampled) {
      const cs = getComputedStyle(el);
      if (cs.display.includes('flex')) flexCount++;
      if (cs.display.includes('grid')) gridCount++;
      widths.push(toPxNumber(cs.width));
      const mw = cs.maxWidth && cs.maxWidth !== 'none' ? toPxNumber(cs.maxWidth) : null;
      if (mw) maxWidths.push(mw);
    }
    return {
      layoutUsage: { flex: flexCount, grid: gridCount },
      typicalWidths: uniqueSortedNumbers(widths).slice(0, 20),
      typicalMaxWidths: Array.from(new Set(maxWidths)).sort((a,b)=>a-b).slice(0, 20)
    };
  }

  function extractPaletteAndTokens(sampled) {
    const colors = new Set();
    const bgColors = new Set();
    const borders = new Set();
    const radii = new Set();
    const spacings = [];
    const shadows = new Set();
    const fonts = new Set();
    const fontSizes = new Set();

    // Propriedades para extração otimizada
    const borderProps = ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'];
    const spacingProps = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 
                         'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];

    // Processar elementos em lotes para melhor performance
    const batchSize = 50;
    for (let i = 0; i < sampled.length; i += batchSize) {
      const batch = sampled.slice(i, i + batchSize);
      
      for (const el of batch) {
        try {
          const cs = getComputedStyle(el);
          
          // Cores de texto
          const c = normalizeColor(cs.color);
          if (c && c !== '#000000' && c !== 'rgba(0, 0, 0, 0)') colors.add(c);
          
          // Cores de fundo
          const bg = normalizeColor(cs.backgroundColor);
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') bgColors.add(bg);
          
          // Cores de borda
          for (const prop of borderProps) {
            const v = normalizeColor(cs[prop]);
            if (v && v !== 'rgba(0, 0, 0, 0)') borders.add(v);
          }
          
          // Border radius
          const br = cs.borderRadius;
          if (br && br !== '0px' && br !== 'none') radii.add(br);
          
          // Espaçamentos
          for (const prop of spacingProps) {
            const v = cs[prop];
            if (v && v !== '0px' && v !== 'auto') spacings.push(v);
          }
          
          // Sombras
          const bs = cs.boxShadow;
          if (bs && bs !== 'none' && bs !== 'rgba(0, 0, 0, 0) 0px 0px 0px 0px') {
            shadows.add(bs);
          }
          
          // Fontes e tamanhos (para análise mais completa)
          const ff = cs.fontFamily;
          if (ff && ff !== 'inherit') fonts.add(ff);
          
          const fs = cs.fontSize;
          if (fs && fs !== 'inherit') fontSizes.add(fs);
          
        } catch (e) {
          console.warn('Erro ao processar elemento:', el, e);
        }
      }
      
      // Pequena pausa para não bloquear a UI em lotes grandes
      if (i % (batchSize * 4) === 0 && sampled.length > 100) {
        // Usar setTimeout com 0ms para yield ao event loop
        setTimeout(() => {}, 0);
      }
    }

    return {
      textColors: Array.from(colors).slice(0, 20), // Limitar para performance
      backgroundColors: Array.from(bgColors).slice(0, 15),
      borderColors: Array.from(borders).slice(0, 10),
      borderRadii: Array.from(radii).slice(0, 10),
      spacingScalePx: uniqueSortedNumbers(spacings).slice(0, 20),
      shadows: Array.from(shadows).slice(0, 8),
      fontFamilies: Array.from(fonts).slice(0, 8),
      fontSizes: Array.from(fontSizes).slice(0, 12)
    };
  }

  function extractMotion(sampled) {
    let transitions = 0, animations = 0;
    const durations = [];
    for (const el of sampled) {
      const cs = getComputedStyle(el);
      const t = cs.transitionDuration || '';
      const a = cs.animationName || 'none';
      if (t && t.split(',').some(x => toPxNumber(x) !== 0)) transitions++;
      if (a && a !== 'none') {
        animations++;
        const ad = cs.animationDuration || '';
        ad.split(',').forEach(d => { if (d) durations.push(d.trim()); });
      }
    }
    return { transitions, animations, animationDurations: Array.from(new Set(durations)) };
  }

  function extractButtonsAndLinks() {
    const btn = firstExisting('button, [role="button"], .btn');
    const link = firstExisting('a');
    const data = {};
    if (btn) {
      const cs = getComputedStyle(btn);
      data.button = {
        font: `${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`,
        padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
        color: cs.color,
        bg: cs.backgroundColor,
        border: `${cs.borderWidth} ${cs.borderStyle} ${cs.borderColor}`,
        radius: cs.borderRadius,
        shadow: cs.boxShadow
      };
    }
    if (link) {
      const cs = getComputedStyle(link);
      data.link = {
        color: cs.color,
        decoration: cs.textDecoration,
        hover: null
      };
      // Best-effort hover capture
      try {
        const ev = new MouseEvent('mouseover', { bubbles: true });
        link.dispatchEvent(ev);
        const hover = getComputedStyle(link);
        data.link.hover = { color: hover.color, decoration: hover.textDecoration };
      } catch (e) {}
    }
    return data;
  }

  function extractStyles() {
    try {
      // Usar cache se disponível e recente
      const cacheKey = `styles_${location.href}_${document.title}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && Date.now() - parsed.timestamp < 30000) { // 30 segundos
            return parsed.data;
          }
        } catch (e) {
          sessionStorage.removeItem(cacheKey);
        }
      }
      
      const sampled = sampleElements(200); // Reduzido de 250 para 200
      
      // Extrair dados em paralelo quando possível
      const typography = extractTypography();
      const variables = collectRootCssVariables();
      const components = extractButtonsAndLinks();
      
      // Estas funções dependem dos elementos amostrados
      const tokens = extractPaletteAndTokens(sampled);
      const motion = extractMotion(sampled);
      const layout = extractLayoutAndDensity(sampled);
      
      const result = {
        pageTitle: document.title || 'Sem título',
        url: location.href,
        domain: location.hostname,
        timestamp: Date.now(),
        elementCount: sampled.length,
        typography,
        tokens,
        motion,
        layout,
        cssVariables: variables.slice(0, 50), // Limitar variáveis CSS
        components,
        notes: {
          prefersColorScheme: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
          language: document.documentElement.getAttribute('lang') || 'unknown',
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          userAgent: navigator.userAgent.substring(0, 100) // Truncar para economia
        }
      };
      
      // Cache do resultado
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn('Não foi possível cachear resultado:', e);
      }
      
      return result;
      
    } catch (error) {
      console.error('Erro durante extração de estilos:', error);
      return {
        error: error.message,
        pageTitle: document.title || 'Erro',
        url: location.href,
        timestamp: Date.now()
      };
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'extract_styles') {
      try {
        const data = extractStyles();
        sendResponse({ ok: true, data });
      } catch (e) {
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
      }
      return true;
    }
  });
})();