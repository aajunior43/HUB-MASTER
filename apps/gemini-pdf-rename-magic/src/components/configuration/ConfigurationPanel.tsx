
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, Cpu, Activity } from 'lucide-react';
import APIKeyManager from '../APIKeyManager';
import AIConfigManager from '../AIConfigManager';
import HealthCheckPanel from '../HealthCheckPanel';

interface ConfigurationPanelProps {
  onApiKeyChange: (geminiKey: string) => void;
  onAIConfigChange: (model: string) => void;
}

export const ConfigurationPanel = ({ onApiKeyChange, onAIConfigChange }: ConfigurationPanelProps) => {
  const [currentApiKey, setCurrentApiKey] = useState('');

  useEffect(() => {
    // Carregar chave API atual do localStorage
    const savedApiKey = localStorage.getItem('gemini_api_key') || '';
    setCurrentApiKey(savedApiKey);
  }, []);

  const handleApiKeyChange = (apiKey: string) => {
    setCurrentApiKey(apiKey);
    onApiKeyChange(apiKey);
  };
  return (
    <div className="space-y-6">
      {/* Clean Header */}
      <div className="text-center pb-4 border-b border-border/30">
        <h2 className="text-xl font-semibold text-foreground mb-2">Configuração</h2>
        <p className="text-sm text-muted-foreground">Configure sua IA</p>
      </div>

      {/* API Configuration */}
      <APIKeyManager onApiKeyChange={handleApiKeyChange} />

      {/* AI Model Configuration */}
      <AIConfigManager onConfigChange={onAIConfigChange} />

      {/* System Status */}
      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-base">
            <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Activity className="h-4 w-4 text-green-600" />
            </div>
            <span className="font-medium">Status do Sistema</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <HealthCheckPanel apiKey={currentApiKey} />
        </CardContent>
      </Card>
    </div>
  );
};
