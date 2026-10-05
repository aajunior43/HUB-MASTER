
import { useState, useMemo } from 'react';

export interface PromptVariable {
  name: string;
  value: string;
  placeholder?: string;
}

export const usePromptVariables = (content: string) => {
  const [variables, setVariables] = useState<PromptVariable[]>([]);

  // Detectar variáveis no formato [variableName] ou [variableName:placeholder]
  const detectedVariables = useMemo(() => {
    const regex = /\[([^:\]]+)(?::([^\]]+))?\]/g;
    const found: { name: string; placeholder?: string }[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const name = match[1].trim();
      const placeholder = match[2]?.trim();
      
      if (!found.some(v => v.name === name)) {
        found.push({ name, placeholder });
      }
    }

    return found;
  }, [content]);

  // Sincronizar variáveis detectadas com o estado
  const syncVariables = () => {
    const newVariables = detectedVariables.map(detected => {
      const existing = variables.find(v => v.name === detected.name);
      return {
        name: detected.name,
        value: existing?.value || '',
        placeholder: detected.placeholder || `Enter ${detected.name}`
      };
    });
    setVariables(newVariables);
  };

  // Processar o conteúdo substituindo variáveis
  const processContent = (originalContent: string) => {
    let processedContent = originalContent;
    
    variables.forEach(variable => {
      const regex = new RegExp(`\\[${variable.name}(?::[^\\]]+)?\\]`, 'g');
      processedContent = processedContent.replace(regex, variable.value || `[${variable.name}]`);
    });

    return processedContent;
  };

  const updateVariable = (name: string, value: string) => {
    setVariables(prev => prev.map(v => 
      v.name === name ? { ...v, value } : v
    ));
  };

  const hasVariables = detectedVariables.length > 0;
  const hasUnfilledVariables = variables.some(v => !v.value.trim());

  return {
    detectedVariables,
    variables,
    syncVariables,
    processContent,
    updateVariable,
    hasVariables,
    hasUnfilledVariables
  };
};
