import { describe, expect, it } from 'vitest';
import { normalizeLinkUrl } from './duplicateLinks';

describe('normalizeLinkUrl', () => {
  it('ignora protocolo, www, fragmento e rastreadores', () => {
    expect(normalizeLinkUrl('https://www.Example.com/page/?utm_source=x#top'))
      .toBe('example.com/page');
  });

  it('mantém parâmetros funcionais ordenados', () => {
    expect(normalizeLinkUrl('example.com/search?b=2&a=1'))
      .toBe('example.com/search?a=1&b=2');
  });
});
