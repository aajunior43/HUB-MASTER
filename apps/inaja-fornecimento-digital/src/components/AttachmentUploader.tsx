import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { db } from '@/integrations/db/client';
import { Paperclip, X, FileImage, FileText, Loader2, Upload } from 'lucide-react';

export interface Anexo {
  name: string;
  url: string;
  type: string;
  path: string;
}

interface Props {
  value: Anexo[];
  onChange: (list: Anexo[]) => void;
  scope: 'solicitacoes' | 'tarefas' | 'pedido-dotacao';
  preservePaths?: string[];
}

const BUCKET = 'solicitacao-anexos';
const MAX_MB = 20;

export function AttachmentUploader({ value, onChange, scope, preservePaths = [] }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: Anexo[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_MB * 1024 * 1024) {
        toast({ title: 'Arquivo grande demais', description: `${file.name} passou de ${MAX_MB}MB.`, variant: 'destructive' });
        continue;
      }
      const path = `anexos/${scope}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error } = await db.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        upsert: false,
        module: scope,
      });
      if (error) {
        toast({ title: 'Falha no upload', description: `${file.name}: ${error.message}`, variant: 'destructive' });
        continue;
      }
      const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 365);
      uploaded.push({
        name: file.name,
        url: signed?.signedUrl || '',
        type: file.type || 'application/octet-stream',
        path,
      });
    }
    setUploading(false);
    if (uploaded.length) {
      onChange([...value, ...uploaded]);
      toast({ title: 'Anexos enviados', description: `${uploaded.length} arquivo(s) adicionado(s).` });
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAnexo = async (a: Anexo) => {
    if (!preservePaths.includes(a.path)) {
      const { error } = await db.storage.from(BUCKET).remove([a.path]);
      if (error) {
        toast({ title: 'Falha ao remover anexo', description: error.message, variant: 'destructive' });
        return;
      }
    }
    onChange(value.filter((x) => x.path !== a.path));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="border-primary/30 text-primary hover:bg-emerald-soft"
        >
          {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Adicionar anexos
        </Button>
        <span className="text-[11px] text-muted-foreground">Arquivos · máx {MAX_MB}MB</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="*/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {value.map((a) => {
            const isImg = a.type.startsWith('image/');
            return (
              <div key={a.path} className="flex items-center gap-2 border border-border/60 rounded-lg p-2 bg-muted/30">
                {isImg ? (
                  <img src={a.url} alt={a.name} className="w-10 h-10 object-cover rounded" />
                ) : (
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <a href={a.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline truncate block">
                    {a.name}
                  </a>
                  <div className="text-[10px] text-muted-foreground uppercase">{isImg ? 'Imagem' : a.type.split('/')[1] || 'arquivo'}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeAnexo(a)} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
