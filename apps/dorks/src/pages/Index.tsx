import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Copy, Search, Trash2, Terminal, Bookmark, Info, Upload, Download, CopyCheck, Sparkles, Network } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { ModeToggle } from "@/components/mode-toggle";

const dorkPresets = [
  { name: "🔓 Portais de Acesso", dork: { searchTerm: "", exactPhrase: "", site: "", fileType: "", inTitle: "login", inUrl: "login", intext: "", excludeTerm: "" } },
  { name: "📄 Arquivos Confidenciais", dork: { searchTerm: "", exactPhrase: "relatório confidencial", site: "", fileType: "pdf", inTitle: "", inUrl: "", intext: "", excludeTerm: "exemplo" } },
  { name: "📁 Diretórios Expostos", dork: { searchTerm: 'intitle:"index of /"', exactPhrase: "", site: "", fileType: "", inTitle: "", inUrl: "", intext: "", excludeTerm: "" } },
  { name: "⚙️ Configurações .env", dork: { searchTerm: "", exactPhrase: "", site: "", fileType: "env", inTitle: "", inUrl: "", intext: "DB_PASSWORD", excludeTerm: "example" } },
  { name: "🔑 Planilhas com Credenciais", dork: { searchTerm: "", exactPhrase: "lista de senhas", site: "", fileType: "xls OR xlsx", inTitle: "", inUrl: "", intext: "", excludeTerm: "" } },
  { name: "📹 Câmeras Online", dork: { searchTerm: "", exactPhrase: "", site: "", fileType: "", inTitle: "", inUrl: "view/view.shtml", intext: "", excludeTerm: "" } },
  { name: "🏛️ Dados Governamentais", dork: { searchTerm: "", exactPhrase: "relatório de contas", site: "gov.br", fileType: "pdf", inTitle: "", inUrl: "", intext: "", excludeTerm: "" } },
  { name: "🔍 Grupos de WhatsApp", dork: { searchTerm: "", exactPhrase: "chat.whatsapp.com", site: "", fileType: "", inTitle: "", inUrl: "", intext: "", excludeTerm: "" } },
  { name: "✈️ Grupos de Telegram", dork: { searchTerm: "", exactPhrase: "t.me", site: "", fileType: "", inTitle: "", inUrl: "", intext: "", excludeTerm: "" } },
  { name: "📄 Documentos Internos", dork: { searchTerm: "", exactPhrase: "uso interno", site: "", fileType: "pdf OR docx", inTitle: "", inUrl: "", intext: "", excludeTerm: "exemplo" } },
  { name: "💾 Backups Expostos", dork: { searchTerm: "", exactPhrase: "", site: "", fileType: "zip OR sql OR backup", inTitle: "index of", inUrl: "backup", intext: "", excludeTerm: "" } },
  { name: "🗃️ Bancos de Dados SQL", dork: { searchTerm: "", exactPhrase: "", site: "", fileType: "sql", inTitle: "", inUrl: "", intext: '"CREATE TABLE" "password"', excludeTerm: "" } },
  { name: "📜 Arquivos de Log com Senhas", dork: { searchTerm: "", exactPhrase: "", site: "", fileType: "log", inTitle: "", inUrl: "", intext: "password", excludeTerm: "" } },
  { name: "☁️ Buckets S3 Abertos", dork: { searchTerm: "", exactPhrase: "", site: "s3.amazonaws.com", fileType: "", inTitle: "", inUrl: "", intext: "", excludeTerm: "" } },
  { name: "🔑 Chaves SSH Privadas", dork: { searchTerm: "", exactPhrase: "-----BEGIN RSA PRIVATE KEY-----", site: "", fileType: "key", inTitle: "", inUrl: "", intext: "", excludeTerm: "" } },
  { name: "👨‍💻 Páginas de Admin Genéricas", dork: { searchTerm: "", exactPhrase: "", site: "", fileType: "", inTitle: "Admin Login", inUrl: "admin", intext: "", excludeTerm: "" } },
];

type DorkState = {
  searchTerm: string;
  exactPhrase: string;
  site: string;
  fileType: string;
  inTitle: string;
  inUrl: string;
  intext: string;
  excludeTerm: string;
};

type HistoryItem = {
  id: string;
  dork: DorkState;
  generatedDork: string;
};

type CustomPreset = {
  id: string;
  name: string;
  dork: DorkState;
};

const TooltipLabel = ({ htmlFor, label, tooltipText }: { htmlFor: string; label: string; tooltipText: string }) => (
  <div className="flex items-center gap-1.5">
    <Label htmlFor={htmlFor} className="font-semibold text-cyan-300">{label}</Label>
    <Tooltip>
      <TooltipTrigger asChild><Info className="h-4 w-4 text-purple-400 cursor-help" /></TooltipTrigger>
      <TooltipContent className="bg-gray-900 border-cyan-500"><p className="text-cyan-100">{tooltipText}</p></TooltipContent>
    </Tooltip>
  </div>
);

const Index = () => {
  const [dorkState, setDorkState] = useState<DorkState>({ searchTerm: "", exactPhrase: "", site: "", fileType: "", inTitle: "", inUrl: "", intext: "", excludeTerm: "" });
  const [generatedDork, setGeneratedDork] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.classList.add('dark'); // Forçar tema escuro
    const loadFromStorage = <T,>(key: string, setter: (data: T[]) => void) => {
      try {
        const storedData = localStorage.getItem(key);
        if (storedData) setter(JSON.parse(storedData));
      } catch (error)
{
        console.error(`Falha ao carregar ${key}:`, error);
        setter([]);
      }
    };
    loadFromStorage('dorkHistory', setHistory);
    loadFromStorage('customDorks', setCustomPresets);
  }, []);

  useEffect(() => {
    const { searchTerm, exactPhrase, site, fileType, inTitle, inUrl, intext, excludeTerm } = dorkState;
    const parts = [];
    if (searchTerm) parts.push(`"${searchTerm}"`);
    if (exactPhrase) parts.push(`"${exactPhrase}"`);
    if (site) parts.push(`site:${site}`);
    if (fileType) parts.push(`filetype:${fileType}`);
    if (inTitle) parts.push(`intitle:"${inTitle}"`);
    if (inUrl) parts.push(`inurl:"${inUrl}"`);
    if (intext) parts.push(`intext:"${intext}"`);
    if (excludeTerm) parts.push(`-${excludeTerm}`);
    setGeneratedDork(parts.join(" "));
  }, [dorkState]);

  const updateAndStore = <T,>(key: string, data: T[], setter: (data: T[]) => void) => {
    setter(data);
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Falha ao salvar ${key}:`, error);
    }
  };

  const handleSearch = (dorkToSearch: string) => {
    if (dorkToSearch) {
      if (!history.some(item => item.generatedDork === dorkToSearch)) {
        const newHistoryItem: HistoryItem = { id: new Date().toISOString(), dork: dorkState, generatedDork: dorkToSearch };
        updateAndStore('dorkHistory', [newHistoryItem, ...history].slice(0, 10), setHistory);
      }
      window.open(`https://www.google.com/search?q=${encodeURIComponent(dorkToSearch)}`, "_blank");
    }
  };

  const handleCopy = () => {
    if (generatedDork) {
      navigator.clipboard.writeText(generatedDork);
      showSuccess("QUERY COPIADA PARA A ÁREA DE TRANSFERÊNCIA");
    }
  };

  const handleCopyAndSearch = () => {
    if (generatedDork) {
      navigator.clipboard.writeText(generatedDork);
      showSuccess("QUERY COPIADA! INICIANDO BUSCA...");
      handleSearch(generatedDork);
    }
  };

  const handlePresetChange = (value: string, presets: { name: string, dork: DorkState }[]) => {
    const selectedPreset = presets.find(p => p.name === value);
    if (selectedPreset) setDorkState(selectedPreset.dork);
  };

  const handleClear = () => setDorkState({ searchTerm: "", exactPhrase: "", site: "", fileType: "", inTitle: "", inUrl: "", intext: "", excludeTerm: "" });

  const loadCustomPreset = (item: CustomPreset) => setDorkState(item.dork);

  const handleSaveDork = () => {
    if (!newPresetName.trim()) {
      showError("ERRO: NOME DO DORK É OBRIGATÁRIO.");
      return;
    }
    if (!generatedDork.trim()) {
      showError("ERRO: IMPOSSÍVEL SALVAR UMA QUERY VAZIA.");
      return;
    }
    const newPreset: CustomPreset = { id: new Date().toISOString(), name: newPresetName, dork: dorkState };
    updateAndStore('customDorks', [...customPresets, newPreset], setCustomPresets);
    showSuccess(`DORK "${newPresetName}" SALVO NA BIBLIOTECA.`);
    setNewPresetName("");
    setIsSaveDialogOpen(false);
  };

  const deleteCustomPreset = (id: string) => {
    const updatedPresets = customPresets.filter(p => p.id !== id);
    updateAndStore('customDorks', updatedPresets, setCustomPresets);
    showSuccess("DORK REMOVIDO DA BIBLIOTECA.");
  };

  const updateField = (field: keyof DorkState, value: string) => {
    setDorkState(prev => ({ ...prev, [field]: value }));
  };

  const handleExport = () => {
    if (customPresets.length === 0) {
      showError("BIBLIOTECA VAZIA. NADA PARA EXPORTAR.");
      return;
    }
    const dataStr = JSON.stringify(customPresets, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dorks_library.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showSuccess("BIBLIOTECA EXPORTADA COM SUCESSO!");
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          showError("FORMATO DE ARQUIVO INVÁLIDO.");
          return;
        }
        const importedPresets = JSON.parse(text);
        if (Array.isArray(importedPresets) && importedPresets.every(p => p.id && p.name && p.dork)) {
          updateAndStore('customDorks', importedPresets, setCustomPresets);
          showSuccess("BIBLIOTECA IMPORTADA COM SUCESSO!");
        } else {
          showError("ARQUIVO INVÁLIDO OU MAL FORMATADO.");
        }
      } catch (error) {
        showError("FALHA AO IMPORTAR O ARQUIVO. VERIFIQUE SE É UM JSON VÁLIDO.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <div className="min-h-screen w-full bg-gray-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-6 py-8">
          <div className="flex items-center justify-center gap-4">
            <div className="bg-gradient-to-r from-cyan-500 to-purple-600 p-3 rounded-full shadow-lg shadow-cyan-500/25">
              <Terminal className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              CYBER DORK GENERATOR
            </h1>
          </div>
          <p className="text-lg text-cyan-300 max-w-2xl mx-auto font-mono">
            &gt; CONSTRUA SUA CONSULTA DE PESQUISA AVANÇADA NO UNIVERSO DIGITAL
          </p>
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg border border-cyan-500/30">
              <Network className="h-4 w-4 text-cyan-400" />
              <span className="text-cyan-300 text-sm font-mono">SISTEMA OPERACIONAL</span>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden shadow-2xl border-2 border-cyan-500/50 bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-cyan-500/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-cyan-300 font-mono">
                  [CONSTRUIR CONSULTA]
                </CardTitle>
                <CardDescription className="text-cyan-100">
                  Preencha os campos abaixo para gerar seu dork
                </CardDescription>
              </div>
              <ModeToggle />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6">
              <div className="grid gap-2">
                <Label htmlFor="preset" className="font-semibold text-cyan-300 text-lg">INICIAR COM TEMPLATE</Label>
                <Select onValueChange={(value) => handlePresetChange(value, dorkPresets)}>
                  <SelectTrigger id="preset" className="w-full py-6 text-base bg-gray-800 border-cyan-500/50 text-cyan-100 hover:border-cyan-400">
                    <SelectValue placeholder="SELECIONE UM TEMPLATE..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-cyan-500">
                    {dorkPresets.map((p) => (
                      <SelectItem key={p.name} value={p.name} className="py-3 text-cyan-100 hover:bg-cyan-900/50">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-cyan-400" />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <TooltipLabel 
                    htmlFor="search-term" 
                    label="TERMO PRINCIPAL" 
                    tooltipText="As palavras-chave principais da sua busca." 
                  />
                  <Input 
                    id="search-term" 
                    placeholder="Ex: relatório de segurança" 
                    value={dorkState.searchTerm} 
                    onChange={(e) => updateField('searchTerm', e.target.value)}
                    className="py-5 text-base bg-gray-800 border-cyan-500/50 text-cyan-100 placeholder-cyan-500/70 focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-2">
                  <TooltipLabel 
                    htmlFor="exact-phrase" 
                    label='FRASE EXATA ""' 
                    tooltipText="Encontre uma frase ou termo exato." 
                  />
                  <Input 
                    id="exact-phrase" 
                    placeholder="Ex: relatório confidencial" 
                    value={dorkState.exactPhrase} 
                    onChange={(e) => updateField('exactPhrase', e.target.value)}
                    className="py-5 text-base bg-gray-800 border-cyan-500/50 text-cyan-100 placeholder-cyan-500/70 focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-2">
                  <TooltipLabel 
                    htmlFor="site" 
                    label="SITE ESPECÍFICO (site:)" 
                    tooltipText="Limite a busca a um site ou domínio específico." 
                  />
                  <Input 
                    id="site" 
                    placeholder="Ex: gov.br" 
                    value={dorkState.site} 
                    onChange={(e) => updateField('site', e.target.value)}
                    className="py-5 text-base bg-gray-800 border-cyan-500/50 text-cyan-100 placeholder-cyan-500/70 focus:border-cyan-400"
                  />
                </div>
                <div className="space-y-2">
                  <TooltipLabel 
                    htmlFor="file-type" 
                    label="TIPO DE ARQUIVO (filetype:)" 
                    tooltipText="Filtre por extensões de arquivo, como pdf, docx, xlsx." 
                  />
                  <Input 
                    id="file-type" 
                    placeholder="Ex: pdf" 
                    value={dorkState.fileType} 
                    onChange={(e) => updateField('fileType', e.target.value)}
                    className="py-5 text-base bg-gray-800 border-cyan-500/50 text-cyan-100 placeholder-cyan-500/70 focus:border-cyan-400"
                  />
                </div>
              </div>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="advanced" className="border-cyan-500/30">
                  <AccordionTrigger className="font-semibold text-lg py-4 text-cyan-300 hover:text-cyan-200">
                    ⚡ OPÇÕES AVANÇADAS
                  </AccordionTrigger>
                  <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-2">
                      <TooltipLabel 
                        htmlFor="in-title" 
                        label="TERMO NO TÍTULO (intitle:)" 
                        tooltipText="Encontre páginas com um termo específico no título." 
                      />
                      <Input 
                        id="in-title" 
                        placeholder="Ex: confidencial" 
                        value={dorkState.inTitle} 
                        onChange={(e) => updateField('inTitle', e.target.value)}
                        className="py-5 text-base bg-gray-800 border-cyan-500/50 text-cyan-100 placeholder-cyan-500/70 focus:border-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <TooltipLabel 
                        htmlFor="in-url" 
                        label="TERMO NA URL (inurl:)" 
                        tooltipText="Busque por termos que aparecem na URL da página." 
                      />
                      <Input 
                        id="in-url" 
                        placeholder="Ex: admin" 
                        value={dorkState.inUrl} 
                        onChange={(e) => updateField('inUrl', e.target.value)}
                        className="py-5 text-base bg-gray-800 border-cyan-500/50 text-cyan-100 placeholder-cyan-500/70 focus:border-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <TooltipLabel 
                        htmlFor="in-text" 
                        label="TERMO NO TEXTO (intext:)" 
                        tooltipText="Procure por termos no corpo do conteúdo da página." 
                      />
                      <Input 
                        id="in-text" 
                        placeholder="Ex: senha" 
                        value={dorkState.intext} 
                        onChange={(e) => updateField('intext', e.target.value)}
                        className="py-5 text-base bg-gray-800 border-cyan-500/50 text-cyan-100 placeholder-cyan-500/70 focus:border-cyan-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <TooltipLabel 
                        htmlFor="exclude-term" 
                        label="EXCLUIR TERMO (-)" 
                        tooltipText="Remova resultados que contenham este termo." 
                      />
                      <Input 
                        id="exclude-term" 
                        placeholder="Ex: exemplo" 
                        value={dorkState.excludeTerm} 
                        onChange={(e) => updateField('excludeTerm', e.target.value)}
                        className="py-5 text-base bg-gray-800 border-cyan-500/50 text-cyan-100 placeholder-cyan-500/70 focus:border-cyan-400"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="space-y-4">
                <Label className="font-semibold text-lg text-cyan-300">QUERY GERADA</Label>
                <div className="relative group">
                  <div className="p-5 bg-gray-800 rounded-lg text-base font-mono break-words min-h-[60px] flex items-center text-cyan-200 border border-cyan-500/50 shadow-inner shadow-cyan-500/10">
                    {generatedDork || "AGUARDANDO INPUT..."}
                  </div>
                  <div className="absolute top-1/2 right-3 -translate-y-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="secondary" 
                          size="icon" 
                          disabled={!generatedDork} 
                          className="h-9 w-9 rounded-full bg-cyan-600 hover:bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-500/25"
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-cyan-500 text-cyan-100">
                        <DialogHeader>
                          <DialogTitle className="text-cyan-300">SALVAR DORK NA BIBLIOTECA</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <Label htmlFor="dork-name" className="text-cyan-300">NOME DO DORK</Label>
                          <Input 
                            id="dork-name" 
                            value={newPresetName} 
                            onChange={(e) => setNewPresetName(e.target.value)} 
                            placeholder="Ex: Busca de relatórios anuais" 
                            className="bg-gray-800 border-cyan-500/50 text-cyan-100"
                          />
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline" className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/50">CANCELAR</Button>
                          </DialogClose>
                          <Button onClick={handleSaveDork} className="bg-cyan-600 hover:bg-cyan-500">SALVAR</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      onClick={handleCopy} 
                      disabled={!generatedDork} 
                      className="h-9 w-9 rounded-full bg-purple-600 hover:bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/25"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-4 bg-gradient-to-r from-gray-800 to-gray-900 border-t border-cyan-500/30 p-6">
            <Button variant="outline" onClick={handleClear} className="px-6 py-5 bg-gray-800 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400">
              <Trash2 className="mr-2 h-5 w-5" />LIMPAR CAMPOS
            </Button>
            <div className="flex gap-3">
              <Button 
                onClick={handleCopyAndSearch} 
                disabled={!generatedDork} 
                variant="outline" 
                className="px-6 py-5 bg-gray-800 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400"
              >
                <CopyCheck className="mr-2 h-5 w-5" />COPIAR E PESQUISAR
              </Button>
              <Button 
                onClick={() => handleSearch(generatedDork)} 
                disabled={!generatedDork} 
                size="lg" 
                className="px-8 py-5 text-base bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/25"
              >
                <Search className="mr-2 h-5 w-5" />EXECUTAR QUERY
              </Button>
            </div>
          </CardFooter>
        </Card>

        {customPresets.length > 0 && (
          <Card className="shadow-xl bg-gray-900/80 border-2 border-purple-500/50 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-gray-800 to-purple-900/30 border-b border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-purple-300">
                    <Bookmark className="h-5 w-5 text-purple-400" />
                    BIBLIOTECA DE DORKS
                  </CardTitle>
                  <CardDescription className="text-purple-200">Seus dorks salvos. Clique para carregar ou remover.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileImport} accept="application/json" className="hidden" />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="border-purple-500/50 text-purple-300 hover:bg-purple-900/50">
                        <Upload className="mr-2 h-4 w-4" />IMPORTAR
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900 border-purple-500 text-cyan-100">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-purple-300">IMPORTAR BIBLIOTECA?</AlertDialogTitle>
                        <AlertDialogDescription className="text-cyan-200">
                          Isso substituirá sua biblioteca de dorks atual. Tem certeza de que deseja continuar?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/50">CANCELAR</AlertDialogCancel>
                        <AlertDialogAction onClick={triggerFileSelect} className="bg-purple-600 hover:bg-purple-500">CONTINUAR</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="outline" size="sm" onClick={handleExport} className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/50">
                    <Download className="mr-2 h-4 w-4" />EXPORTAR
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {customPresets.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between gap-3 p-4 bg-gray-800/50 rounded-lg group hover:bg-cyan-900/30 transition-all duration-200 border border-cyan-500/20 hover:border-cyan-400/50"
                  >
                    <div onClick={() => loadCustomPreset(item)} className="flex-grow cursor-pointer">
                      <p className="font-semibold text-cyan-300">{item.name}</p>
                      <p className="text-sm font-mono text-cyan-200/70 break-words mt-1">
                        {item.dork.searchTerm} {item.dork.site && `site:${item.dork.site}`}...
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 opacity-0 group-hover:opacity-100 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30" 
                      onClick={() => deleteCustomPreset(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;