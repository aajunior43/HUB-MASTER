import "@testing-library/jest-dom";
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jspdf uses canvas; stub save so PDF tests don't crash in jsdom
vi.mock("jspdf", () => {
  const saveMock = vi.fn();
  class FakeDoc {
    lastAutoTable = { finalY: 120 };
    internal = {
      pageSize: { getWidth: () => 210, getHeight: () => 297 },
      getNumberOfPages: () => 1,
      getFontSize: () => 10,
      getFont: () => ({ fontName: "helvetica", fontStyle: "normal" }),
    };
    setFontSize() { return this; }
    setFont() { return this; }
    setDrawColor() { return this; }
    setFillColor() { return this; }
    setTextColor() { return this; }
    setLineWidth() { return this; }
    setProperties() { return this; }
    text() { return this; }
    line() { return this; }
    rect() { return this; }
    roundedRect() { return this; }
    addImage() { return this; }
    splitTextToSize(t: string) { return [t]; }
    getImageProperties() { return { width: 100, height: 100 }; }
    getTextColor() { return 0; }
    getNumberOfPages() { return 1; }
    setPage() { return this; }
    addPage() { return this; }
    save = saveMock;
  }
  return { default: FakeDoc, __saveMock: saveMock };
});

vi.mock("jspdf-autotable", () => ({
  default: (doc: { lastAutoTable?: { finalY: number } }) => {
    doc.lastAutoTable = { finalY: 120 };
  },
}));

// Global window.confirm default
window.confirm = vi.fn(() => true);

// ResizeObserver used by Radix
class RO { observe() {} unobserve() {} disconnect() {} }
window.ResizeObserver = RO as typeof ResizeObserver;

// Radix uses these pointer APIs which jsdom lacks
interface ElementWithPointerApis extends Element {
  hasPointerCapture(pointerId: number): boolean;
  setPointerCapture(pointerId: number): void;
  releasePointerCapture(pointerId: number): void;
  scrollIntoView(): void;
}

const elementProto = Element.prototype as ElementWithPointerApis;
if (!elementProto.hasPointerCapture) {
  elementProto.hasPointerCapture = () => false;
  elementProto.setPointerCapture = () => {};
  elementProto.releasePointerCapture = () => {};
}
if (!elementProto.scrollIntoView) {
  elementProto.scrollIntoView = () => {};
}

// Stub fetch so PDF generation (which loads /brasao.png) works under jsdom.
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    blob: async () => new Blob([""], { type: "image/png" }),
  })) as unknown as typeof fetch;
}

// Image never loads real assets in jsdom — resolve immediately so PDF logo load doesn't hang.
class FakeImage {
  onload: ((this: FakeImage, ev: Event) => void) | null = null;
  onerror: ((this: FakeImage, ev: Event) => void) | null = null;
  width = 100;
  height = 100;
  crossOrigin = "";
  set src(_v: string) {
    queueMicrotask(() => {
      this.onerror?.call(this, new Event("error"));
    });
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).Image = FakeImage;