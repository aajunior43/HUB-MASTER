import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Save, Upload, Download, Database, Plus, X, User, Building2, FileText } from "lucide-react";
import type { useDataManager } from "@/hooks/useDataManager";

type DataManagerHook = ReturnType<typeof useDataManager>;

interface DataManagerProps {
  onSelectSolicitante: (nome: string) => void;
  onSelectEmpresa: (empresa: string) => void;
  onSelectObservacao: (observacao: string) => void;
  currentSolicitante?: string;
  currentEmpresa?: string;
  currentObservacao?: string;
  dataManager: DataManagerHook;
}

export const DataManager = ({
  onSelectSolicitante, onSelectEmpresa, onSelectObservacao,
  currentSolicitante, currentEmpresa, currentObservacao,
  dataManager,
}: DataManagerProps) => {
  const [newSolicitante, setNewSolicitante] = useState('');
  const [newEmpresa, setNewEmpresa] = useState('');
  const [newObservacao, setNewObservacao] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    savedData, addSolicitante, addEmpresa, addObservacao,
    removeSolicitante, removeEmpresa, removeObservacao, exportData, importData,
  } = dataManager;

  const handleSaveCurrentData = () => {
    if (currentSolicitante?.trim()) addSolicitante(currentSolicitante);
    if (currentEmpresa?.trim()) addEmpresa(currentEmpresa);
    if (currentObservacao?.trim()) addObservacao(currentObservacao);
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importData(file);
    } catch (error) {
      console.error('Erro ao importar dados:', error);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasData =
    savedData.solicitantes.length +
    savedData.empresas.length +
    savedData.observacoes.length > 0;

  return (
    <Card className="rounded-2xl border-border/60 shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-primary text-sm font-display flex items-center gap-2">
          <span className="w-1 h-5 bg-accent rounded-full" />
          <Database className="h-4 w-4" />
          Gerenciador de Dados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ações principais */}
        <div className="space-y-3">
          <Button
            onClick={handleSaveCurrentData}
            size="sm"
            className="w-full bg-primary text-accent hover:bg-primary/90 font-semibold"
          >
            <Save className="mr-2 h-4 w-4" />
            Salvar Dados Atuais
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={exportData}
              size="sm"
              variant="outline"
              className="border-border text-primary hover:bg-emerald-soft"
              disabled={!hasData}
            >
              <Download className="mr-2 h-3 w-3" />
              Exportar
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportData}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              size="sm"
              variant="outline"
              className="border-border text-primary hover:bg-emerald-soft"
              disabled={importing}
            >
              <Upload className="mr-2 h-3 w-3" />
              {importing ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>

        <Separator />

        <DataGroup
          icon={<User className="w-3.5 h-3.5" />}
          label="Solicitantes"
          count={savedData.solicitantes.length}
          value={newSolicitante}
          onChange={setNewSolicitante}
          onAdd={() => { if (newSolicitante.trim()) { addSolicitante(newSolicitante); setNewSolicitante(''); } }}
          items={savedData.solicitantes}
          onSelect={onSelectSolicitante}
          onRemove={removeSolicitante}
          placeholder="Novo solicitante"
          emptyMsg="Nenhum solicitante salvo"
        />

        <Separator />

        <DataGroup
          icon={<Building2 className="w-3.5 h-3.5" />}
          label="Empresas"
          count={savedData.empresas.length}
          value={newEmpresa}
          onChange={setNewEmpresa}
          onAdd={() => { if (newEmpresa.trim()) { addEmpresa(newEmpresa); setNewEmpresa(''); } }}
          items={savedData.empresas}
          onSelect={onSelectEmpresa}
          onRemove={removeEmpresa}
          placeholder="Nova empresa"
          emptyMsg="Nenhuma empresa salva"
        />

        <Separator />

        <DataGroup
          icon={<FileText className="w-3.5 h-3.5" />}
          label="Observações"
          count={savedData.observacoes.length}
          value={newObservacao}
          onChange={setNewObservacao}
          onAdd={() => { if (newObservacao.trim()) { addObservacao(newObservacao); setNewObservacao(''); } }}
          items={savedData.observacoes}
          onSelect={onSelectObservacao}
          onRemove={removeObservacao}
          placeholder="Nova observação"
          emptyMsg="Nenhuma observação salva"
          truncate
        />
      </CardContent>
    </Card>
  );
};

interface DataGroupProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  items: string[];
  onSelect: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
  emptyMsg: string;
  truncate?: boolean;
}

const DataGroup = ({
  icon, label, count, value, onChange, onAdd, items, onSelect, onRemove, placeholder, emptyMsg, truncate,
}: DataGroupProps) => (
  <div className="space-y-3">
    <Label className="text-[11px] font-bold uppercase tracking-widest text-secondary flex items-center gap-2">
      {icon}
      {label} <span className="text-muted-foreground normal-case tracking-normal">({count})</span>
    </Label>

    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-muted/40 border-border focus-visible:ring-accent text-sm"
        onKeyDown={(e) => e.key === 'Enter' && onAdd()}
      />
      <Button onClick={onAdd} size="icon" className="bg-primary text-accent hover:bg-primary/90 shrink-0">
        <Plus className="h-4 w-4" />
      </Button>
    </div>

    <ScrollArea className="h-28 w-full pr-2">
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 group">
            <Badge
              variant="secondary"
              className="cursor-pointer bg-emerald-soft text-emerald-deep hover:bg-accent/20 hover:text-primary text-xs flex-1 justify-start font-normal py-1.5 px-2.5 transition-colors"
              onClick={() => onSelect(item)}
            >
              {truncate && item.length > 40 ? `${item.substring(0, 40)}...` : item}
            </Badge>
            <Button
              onClick={() => onRemove(item)}
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:bg-destructive/10 opacity-60 group-hover:opacity-100"
              aria-label={`Remover ${item}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-muted-foreground text-xs text-center py-3 italic">{emptyMsg}</p>
        )}
      </div>
    </ScrollArea>
  </div>
);
