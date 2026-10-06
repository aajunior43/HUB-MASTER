import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Save, Upload, FileText, X, Package } from "lucide-react";
import { useTemplates, TemplateData } from "@/hooks/useTemplates";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "@/hooks/use-toast";
import type { SolicitationFormData, SolicitationItem } from "@/types/solicitacao";

interface TemplateManagerProps {
  formData: SolicitationFormData;
  items: SolicitationItem[];
  onLoadTemplate: (template: TemplateData) => void;
}

export const TemplateManager = ({ formData, items, onLoadTemplate }: TemplateManagerProps) => {
  const [templateName, setTemplateName] = useState('');
  const [salvando, setSalvando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { templates, loading, saveTemplate, deleteTemplate, loadTemplate } = useTemplates();
  const { confirm, confirmElement } = useConfirm();

  const handleSaveTemplate = async () => {
    if (!templateName.trim() || salvando) return;
    setSalvando(true);
    await saveTemplate(templateName, formData, items);
    setSalvando(false);
    setTemplateName('');
  };

  const handleLoadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const template = await loadTemplate(file);
      onLoadTemplate(template);
    } catch (error) {
      toast({
        title: 'Modelo inválido',
        description: error instanceof Error ? error.message : 'Não foi possível ler o arquivo .json.',
        variant: 'destructive',
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!(await confirm({ title: 'Excluir modelo', description: `Excluir o modelo “${name}”?`, confirmLabel: 'Excluir' }))) return;
    deleteTemplate(id);
  };

  return (
    <Card className="rounded-2xl border-border/60 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-primary text-sm font-display flex items-center gap-2">
          <span className="w-1 h-5 bg-accent rounded-full" />
          <FileText className="h-4 w-4" />
          Modelos Salvos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="template-name" className="text-[11px] font-bold uppercase tracking-widest text-secondary">
              Nome do Modelo
            </Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Ex.: Modelo Padrão"
              className="bg-muted/40 border-border focus-visible:ring-accent"
            />
          </div>
          <Button
            onClick={() => void handleSaveTemplate()}
            disabled={!templateName.trim() || salvando}
            size="sm"
            className="w-full bg-primary text-accent hover:bg-primary/90 font-semibold"
          >
            <Save className="mr-2 h-4 w-4" />
            {salvando ? "Salvando..." : "Salvar Modelo Atual"}
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-secondary flex items-center gap-2">
            <Package className="w-3.5 h-3.5" />
            Modelos no Banco <span className="text-muted-foreground normal-case tracking-normal">({templates.length})</span>
          </Label>
          <ScrollArea className="h-56 w-full pr-2">
            <div className="space-y-1">
              {loading && <p className="text-muted-foreground text-xs italic text-center py-3">Carregando...</p>}
              {!loading && templates.length === 0 && (
                <p className="text-muted-foreground text-xs italic text-center py-3">Nenhum modelo salvo ainda</p>
              )}
              {templates.map((t) => (
                <div key={t.id} className="flex items-center gap-2 group">
                  <Badge
                    variant="secondary"
                    role="button"
                    tabIndex={0}
                    aria-label={`Carregar modelo ${t.name}`}
                    className="cursor-pointer bg-emerald-soft text-emerald-deep hover:bg-accent/20 hover:text-primary text-xs flex-1 justify-start font-normal py-1.5 px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onLoadTemplate(t)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onLoadTemplate(t); } }}
                  >
                    {t.name}
                  </Badge>
                  <Button
                    onClick={() => void handleDeleteTemplate(t.id, t.name)}
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:bg-destructive/10 opacity-60 group-hover:opacity-100"
                    aria-label={`Remover ${t.name}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-[11px] font-bold uppercase tracking-widest text-secondary">Importar de arquivo</Label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleLoadFile}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            size="sm"
            variant="outline"
            className="w-full border-border text-primary hover:bg-emerald-soft"
          >
            <Upload className="mr-2 h-4 w-4" />
            Carregar Modelo (.json)
          </Button>
        </div>
      </CardContent>
      {confirmElement}
    </Card>
  );
};
