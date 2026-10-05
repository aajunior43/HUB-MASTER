import { useState } from 'react';
import { 
  Zap, 
  Download, 
  Upload, 
  Shuffle, 
  Filter,
  Sparkles,
  RefreshCw,
  Bookmark,
  Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Prompt, CreatePromptData } from '@/types/prompt';
import { useIsMobile } from '@/hooks/use-mobile';

interface QuickActionsProps {
  prompts: Prompt[];
  onCreatePrompt: () => void;
  onRefresh?: () => void;
  onImportPrompts?: (prompts: CreatePromptData[]) => void;
  onExportPrompts?: () => void;
}

export const QuickActions = ({ 
  prompts, 
  onCreatePrompt, 
  onRefresh,
  onImportPrompts,
  onExportPrompts 
}: QuickActionsProps) => {
  const [isShuffling, setIsShuffling] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleRandomPrompt = async () => {
    if (prompts.length === 0) {
      toast({
        title: "📝 Nenhum prompt disponível",
        description: "Crie alguns prompts primeiro!",
        variant: "destructive"
      });
      return;
    }

    setIsShuffling(true);
    
    // Simula um efeito de shuffle
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    try {
      await navigator.clipboard.writeText(randomPrompt.content);
      toast({
        title: "🎲 Prompt aleatório copiado!",
        description: `"${randomPrompt.title}" foi copiado para área de transferência.`,
      });
    } catch (error) {
      toast({
        title: "🎲 Prompt aleatório selecionado",
        description: `"${randomPrompt.title}" - ${randomPrompt.content.substring(0, 100)}...`,
      });
    }
    
    setIsShuffling(false);
  };

  const handleQuickShare = async () => {
    if (prompts.length === 0) {
      toast({
        title: "📝 Nenhum prompt para compartilhar",
        description: "Crie alguns prompts primeiro!",
        variant: "destructive"
      });
      return;
    }

    const shareData = {
      title: 'Minha Coleção de Prompts',
      text: `Confira minha coleção de ${prompts.length} prompts incríveis!`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: "📤 Compartilhado com sucesso!",
          description: "Sua coleção foi compartilhada.",
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "🔗 Link copiado!",
          description: "O link da sua coleção foi copiado.",
        });
      }
    } catch (error) {
      console.log('Erro ao compartilhar:', error);
    }
  };

  const quickTemplates = [
    {
      title: "Análise de Dados",
      content: "Analise os seguintes dados e forneça insights detalhados: [dados]",
      category: "Analytics",
      tags: ["analise", "dados", "insights"]
    },
    {
      title: "Geração de Ideias",
      content: "Gere 10 ideias criativas para [tópico] considerando [contexto]",
      category: "Creative",
      tags: ["ideias", "criativo", "brainstorm"]
    },
    {
      title: "Revisão de Texto",
      content: "Revise e melhore o seguinte texto, corrigindo gramática e estilo: [texto]",
      category: "Writing",
      tags: ["revisao", "escrita", "grammar"]
    },
    {
      title: "Estratégia de Marketing",
      content: "Desenvolva uma estratégia de marketing para [produto/serviço] focando em [público-alvo]",
      category: "Marketing",
      tags: ["marketing", "estrategia", "vendas"]
    }
  ];

  const handleQuickTemplate = async (template: typeof quickTemplates[0]) => {
    if (onImportPrompts) {
      onImportPrompts([template]);
      toast({
        title: "✨ Template adicionado!",
        description: `"${template.title}" foi criado com sucesso.`,
      });
    }
  };

  const actions = [
    {
      icon: Sparkles,
      label: "Novo Prompt",
      description: "Criar prompt personalizado",
      color: "from-primary to-accent",
      action: onCreatePrompt,
      shortcut: "Ctrl+N"
    },
    {
      icon: Shuffle,
      label: "Aleatório",
      description: "Copiar prompt aleatório",
      color: "from-purple-500 to-pink-500",
      action: handleRandomPrompt,
      loading: isShuffling,
      disabled: prompts.length === 0,
      shortcut: "Ctrl+R"
    },
    {
      icon: Share2,
      label: "Compartilhar",
      description: "Compartilhar coleção",
      color: "from-blue-500 to-cyan-500",
      action: handleQuickShare,
      disabled: prompts.length === 0
    },
    {
      icon: RefreshCw,
      label: "Atualizar",
      description: "Recarregar prompts",
      color: "from-green-500 to-emerald-500",
      action: onRefresh,
      shortcut: "F5"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card className="glass-effect border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg gradient-bg border border-primary/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Ações Rápidas</h3>
              <p className="text-xs text-muted-foreground">Acelere seu fluxo de trabalho</p>
            </div>
          </div>

          <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <TooltipProvider>
              {actions.map((action, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className={`h-auto p-3 flex flex-col items-center gap-2 border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-105 ${
                        action.disabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      onClick={action.action}
                      disabled={action.disabled || action.loading}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center shadow-sm`}>
                        <action.icon className={`w-4 h-4 text-white ${action.loading ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium">{action.label}</p>
                        {!isMobile && (
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            {action.description}
                          </p>
                        )}
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{action.description}</p>
                    {action.shortcut && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Atalho: {action.shortcut}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* Quick Templates */}
      <Card className="glass-effect border-accent/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/20 flex items-center justify-center">
              <Bookmark className="w-4 h-4 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Templates Rápidos</h3>
              <p className="text-xs text-muted-foreground">Comece com modelos prontos</p>
            </div>
          </div>

          <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {quickTemplates.map((template, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-border/30 hover:border-accent/40 transition-all duration-300 cursor-pointer hover:bg-accent/5 group"
                onClick={() => handleQuickTemplate(template)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                    {template.title}
                  </h4>
                  <Badge variant="outline" className="text-xs bg-accent/10 border-accent/30 text-accent">
                    {template.category}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {template.content}
                </p>
                <div className="flex flex-wrap gap-1">
                  {template.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-[10px] h-4 px-1 bg-muted/30 border-muted text-muted-foreground"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};