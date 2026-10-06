import { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ApiKeyInputProps {
  onApiKeySet: (apiKey: string) => void;
}

export function ApiKeyInput({ onApiKeySet }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini-api-key');
    if (storedKey) {
      setHasStoredKey(true);
      onApiKeySet(storedKey);
    }
  }, [onApiKeySet]);

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error('Digite uma API key válida');
      return;
    }

    localStorage.setItem('gemini-api-key', apiKey.trim());
    setHasStoredKey(true);
    onApiKeySet(apiKey.trim());
    toast.success('API Key salva com sucesso!');
  };

  const clearApiKey = () => {
    localStorage.removeItem('gemini-api-key');
    setApiKey('');
    setHasStoredKey(false);
    onApiKeySet('');
    toast.success('API Key removida');
  };

  if (hasStoredKey) {
    return (
      <Card className="p-4 mb-6 shadow-card border-0 bg-success/5 backdrop-blur-sm border-success/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">
              API Key do Gemini configurada
            </span>
          </div>
          <Button 
            onClick={clearApiKey}
            variant="outline" 
            size="sm"
            className="text-xs"
          >
            Alterar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6 shadow-card border-0 bg-card/60 backdrop-blur-sm border-destructive/20">
      <div className="text-center mb-4">
        <Key className="h-8 w-8 text-primary mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-foreground">
          Configure sua API Key do Gemini
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Obtenha gratuitamente em{' '}
          <a 
            href="https://makersuite.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline hover:text-primary-glow"
          >
            Google AI Studio
          </a>
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key do Gemini</Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              placeholder="AIzaSyC..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-20"
            />
            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1">
              <Button
                type="button"
                onClick={() => setShowKey(!showKey)}
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <Button 
          onClick={saveApiKey}
          className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-200"
          disabled={!apiKey.trim()}
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar API Key
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          A chave é armazenada localmente no seu navegador
        </p>
      </div>
    </Card>
  );
}