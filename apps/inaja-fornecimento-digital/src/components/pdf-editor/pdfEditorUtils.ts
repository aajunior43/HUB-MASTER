import type { PdfPageItem } from './pdfTypes';

export function togglePageSelection(items: PdfPageItem[], pageNumber: number) {
  return items.map((item) => item.pageNumber === pageNumber ? { ...item, selected: !item.selected } : item);
}
export function invertPageSelection(items: PdfPageItem[]) {
  return items.map((item) => ({ ...item, selected: !item.selected }));
}

export function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function getSelectedPageNumbers(items: PdfPageItem[]) {
  return items.filter((item) => item.selected).map((item) => item.pageNumber);
}

export function getPasswordStrength(password: string): 'fraca' | 'media' | 'forte' {
  if (password.length < 6) return 'fraca';
  const score = Number(/[A-Z]/.test(password)) + Number(/[0-9]/.test(password)) + Number(/[^A-Za-z0-9]/.test(password));
  return score >= 2 && password.length >= 10 ? 'forte' : 'media';
}
