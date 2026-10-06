import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

export function PdfProcessingStatus({ state, message }: { state: 'idle' | 'loading' | 'success' | 'error'; message?: string }) {
  if (state === 'idle') return null;
  const content = state === 'loading' ? <><Loader2 className="h-4 w-4 animate-spin" /> {message || 'Processando PDF…'}</> : state === 'success' ? <><CheckCircle2 className="h-4 w-4" /> {message || 'PDF gerado com sucesso.'}</> : <><AlertCircle className="h-4 w-4" /> {message || 'Não foi possível processar o PDF.'}</>;
  return <div role={state === 'error' ? 'alert' : 'status'} className={`mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${state === 'error' ? 'border-destructive/30 bg-destructive/5 text-destructive' : state === 'success' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700' : 'border-primary/20 bg-primary/5 text-primary'}`}>{content}</div>;
}
