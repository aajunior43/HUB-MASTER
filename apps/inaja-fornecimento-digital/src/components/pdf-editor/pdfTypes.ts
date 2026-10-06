export type PdfPageItem = {
  id: string;
  pageNumber: number;
  selected: boolean;
  rotation: number;
};
export type PdfEditorFile = {
  id: string;
  file: File;
  buffer: ArrayBuffer;
  paginas: number;
  pages: PdfPageItem[];
};
