
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GeminiApiConfigProps {
  onApiKeySet?: (apiKey: string) => void;
}

export const GeminiApiConfig = ({ onApiKeySet }: GeminiApiConfigProps) => {
  const [apiKey, setApiKey] = useState('');
  const [isStored, setIsStored] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setIsStored(true);
      if (onApiKeySet) {
        onApiKeySet(storedKey);
      }
    }
  }, [onApiKeySet]);

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key inválida",
        description: "Por favor, insira uma API Key válida.",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem('gemini_api_key', apiKey);
    setIsStored(true);
    
    if (onApiKeySet) {
      onApiKeySet(apiKey);
    }

    toast({
      title: "API Key salva",
      description: "Sua API Key do Google Gemini foi salva localmente.",
    });
  };

  const handleRemoveApiKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setIsStored(false);
    
    if (onApiKeySet) {
      onApiKeySet('');
    }

    toast({
      title: "API Key removida",
      description: "Sua API Key foi removida.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Key className="w-5 h-5" />
          Configuração Google Gemini
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="gemini-api-key">API Key do Google Gemini</Label>
          <Input
            id="gemini-api-key"
            type="password"
            placeholder="Cole sua API Key aqui..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Sua API Key é armazenada localmente no seu navegador de forma segura.
          </p>
        </div>

        <div className="flex gap-2">
          {!isStored ? (
            <Button onClick={handleSaveApiKey} className="flex-1">
              Salvar API Key
            </Button>
          ) : (
            <Button onClick={handleRemoveApiKey} variant="outline" className="flex-1">
              Remover API Key
            </Button>
          )}
          
          <Button variant="outline" asChild>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Obter API Key
            </a>
          </Button>
        </div>

        {isStored && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            ✅ API Key configurada! Agora você pode usar as funcionalidades do Gemini.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
