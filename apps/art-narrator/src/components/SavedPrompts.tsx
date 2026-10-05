import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, 
  Trash2, 
  Download,
  Share2,
  BookOpen,
  Search
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface SavedPrompt {
  id: string;
  text: string;
  category: string;
  type: "text" | "image";
  complexity: "simple" | "detailed" | "expert";
  tags: string[];
  timestamp: Date;
}

export default function SavedPrompts() {
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadSavedPrompts();
  }, []);

  const loadSavedPrompts = () => {
    const saved = localStorage.getItem('savedPrompts');
    if (saved) {
      const prompts = JSON.parse(saved).map((prompt: any) => ({
        ...prompt,
        timestamp: new Date(prompt.timestamp)
      }));
      setSavedPrompts(prompts);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Prompt copiado!");
  };

  const handleDelete = (id: string) => {
    const updated = savedPrompts.filter(p => p.id !== id);
    setSavedPrompts(updated);
    localStorage.setItem('savedPrompts', JSON.stringify(updated));
    toast.success("Prompt removido!");
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(savedPrompts, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'art-narrator-prompts.json';
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Prompts exportados!");
  };

  const filteredPrompts = savedPrompts.filter(prompt =>
    prompt.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="w-full max-w-4xl mx-auto px-4 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Biblioteca de Prompts
          </h2>
        </div>
        <p className="text-muted-foreground">
          Seus prompts salvos ficam armazenados localmente
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar prompts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {filteredPrompts.length} prompts
          </Badge>
          {savedPrompts.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {filteredPrompts.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">
            {savedPrompts.length === 0 ? "Nenhum prompt salvo" : "Nenhum resultado encontrado"}
          </h3>
          <p className="text-muted-foreground">
            {savedPrompts.length === 0 
              ? "Comece gerando e salvando seus primeiros prompts" 
              : "Tente ajustar sua busca"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPrompts.map((prompt) => (
            <Card key={prompt.id} className="glass-card p-6 group hover:glow-effect transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-card-foreground leading-relaxed text-sm sm:text-base flex-1">
                    {prompt.text}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {prompt.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs bg-muted/20 border-border/30">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/20">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="capitalize">{prompt.complexity}</span>
                    <span>•</span>
                    <span className="capitalize">{prompt.category}</span>
                    <span>•</span>
                    <span>{prompt.timestamp.toLocaleDateString('pt-BR')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopy(prompt.text)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(prompt.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}