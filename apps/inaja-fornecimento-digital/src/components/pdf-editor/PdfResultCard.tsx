import { Download, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PdfResultCard({ name, bytes, originalBytes, reductionPercent, onDownload }: { name: string; bytes: Uint8Array; originalBytes?: number; reductionPercent?: number; onDownload: () => void }) {
  return <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4"><div className="flex items-center gap-3"><FileCheck2 className="h-6 w-6 text-emerald-600" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{name}</p><p className="text-xs text-muted-foreground">{(bytes.byteLength / 1024).toFixed(1)} KB{originalBytes ? ` · original ${(originalBytes / 1024).toFixed(1)} KB` : ''}{reductionPercent !== undefined ? ` · redução de ${reductionPercent}%` : ''}</p></div><Button size="sm" onClick={onDownload}><Download /> Baixar novamente</Button></div></div>;
}
