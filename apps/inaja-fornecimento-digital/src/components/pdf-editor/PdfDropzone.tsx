import { useRef, useState, type DragEvent } from 'react';
import { Upload } from 'lucide-react';

const isPdf = (file: File) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

export function PdfDropzone({ multiple = false, disabled = false, onFiles }: { multiple?: boolean; disabled?: boolean; onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const accept = (files: FileList | null) => onFiles(files ? Array.from(files).filter(isPdf) : []);
  const drop = (event: DragEvent<HTMLButtonElement>) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files); };
  return <button type="button" disabled={disabled} aria-label={multiple ? 'Selecionar um ou mais arquivos PDF' : 'Selecionar um arquivo PDF'} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop} className={`group w-full rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:border-primary/60 hover:bg-primary/5'} disabled:cursor-not-allowed disabled:opacity-60`}>
    <Upload className="mx-auto mb-3 h-8 w-8 text-primary" />
    <span className="block font-medium">Arraste um PDF aqui ou clique para selecionar</span>
    <span className="mt-2 block text-xs text-muted-foreground">PDF até 20 MB · processado localmente no navegador</span>
    <input ref={inputRef} hidden type="file" accept="application/pdf,.pdf" multiple={multiple} onChange={(event) => { accept(event.target.files); event.currentTarget.value = ''; }} />
  </button>;
}
