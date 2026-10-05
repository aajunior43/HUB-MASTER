import { describe, expect, it } from 'vitest';
import { getPasswordStrength, getSelectedPageNumbers, invertPageSelection, reorderItems, togglePageSelection } from './pdfEditorUtils';
import type { PdfPageItem } from './pdfTypes';

const pages: PdfPageItem[] = [1, 2, 3].map((pageNumber) => ({ id: `p${pageNumber}`, pageNumber, selected: pageNumber === 1, rotation: 0 }));

describe('pdf editor helpers', () => {
  it('toggles and inverts selected pages immutably', () => {
    expect(getSelectedPageNumbers(togglePageSelection(pages, 2))).toEqual([1, 2]);
    expect(getSelectedPageNumbers(invertPageSelection(pages))).toEqual([2, 3]);
    expect(getSelectedPageNumbers(pages)).toEqual([1]);
  });

  it('reorders items without mutating the source', () => {
    expect(reorderItems(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(['a', 'b', 'c']).toEqual(['a', 'b', 'c']);
  });

  it('reports password strength', () => {
    expect(getPasswordStrength('123')).toBe('fraca');
    expect(getPasswordStrength('abc123')).toBe('media');
    expect(getPasswordStrength('Prefeitura#2026')).toBe('forte');
  });
});
