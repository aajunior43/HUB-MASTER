
import { useState } from 'react';
import { Copy, Edit, Trash2, Eye, Calendar, Hash, Tag, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Prompt } from '@/types/prompt';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface PromptCardProps {
  prompt: Prompt;
  onEdit: (prompt: Prompt) => void;
  onDelete: (id: string) => void;
  onView: (prompt: Prompt) => void;
}

export const PromptCard = ({ prompt, onEdit, onDelete, onView }: PromptCardProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleCopy = async () => {
    setIsLoading(true);
    try {
      await navigator.clipboard.writeText(prompt.content);
      toast({
        title: "✨ Copiado com sucesso!",
        description: "Prompt copiado para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "⚠️ Erro",
        description: "Não foi possível copiar o prompt.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: isMobile ? '2-digit' : 'short',
      year: isMobile ? '2-digit' : 'numeric'
    });
  };

  const getPreview = (content: string, maxLength: number = isMobile ? 120 : 150) => {
    return content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;
  };

  return (
    <Card 
      className={`group relative overflow-hidden border-primary/20 gradient-bg backdrop-blur-sm transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-primary/20 ${
        isHovered 
          ? 'shadow-2xl shadow-primary/25 -translate-y-2 border-primary/40 honey-gradient scale-105' 
          : 'shadow-lg hover:shadow-xl hover:-translate-y-1 hover:border-primary/30'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onView(prompt)}
    >
      {/* Decorative elements */}
      <div className={`absolute top-4 right-4 transition-all duration-500 ${
        isHovered ? 'opacity-100 scale-110 rotate-12' : 'opacity-60'
      }`}>
        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
      </div>
      
      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 transition-opacity duration-500 ${
        isHovered ? 'opacity-100' : 'opacity-0'
      }`} />
      
      <CardHeader className={`relative pb-3 transition-all duration-300 ${isHovered ? 'pb-4' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-base sm:text-lg text-card-foreground truncate transition-all duration-300 ${
              isHovered ? 'text-primary scale-105' : 'group-hover:text-primary'
            }`}>
              {prompt.title}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Calendar className="w-3 h-3 opacity-70" />
                <span className="font-medium">{formatDate(prompt.updated_at)}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/10 border border-accent/20">
                <Hash className="w-3 h-3 opacity-70" />
                <span className="font-medium">v{prompt.version}</span>
              </div>
            </div>
          </div>
          
          {prompt.category && (
            <Badge 
              variant="secondary" 
              className={`bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/30 text-xs font-semibold transition-all duration-300 shadow-sm ${
                isHovered ? 'bg-gradient-to-r from-primary/30 to-accent/30 scale-110 shadow-md' : ''
              }`}
            >
              {prompt.category}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        <p className={`text-sm leading-relaxed transition-all duration-300 font-medium ${
          isHovered ? 'text-foreground' : 'text-muted-foreground'
        }`}>
          {getPreview(prompt.content)}
        </p>

        {prompt.tags && prompt.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <Tag className="w-3 h-3 text-primary opacity-70 mr-1" />
            {prompt.tags.slice(0, isMobile ? 2 : 3).map((tag, index) => (
              <Badge
                key={tag}
                variant="outline"
                className={`text-xs bg-accent/20 text-accent-foreground border-accent/40 font-medium transition-all duration-300 ${
                  isHovered ? 'bg-accent/30 scale-105 shadow-sm' : ''
                }`}
                style={{ 
                  animationDelay: `${index * 100}ms`,
                  animation: isHovered ? 'bounce-in 0.4s ease-out' : undefined
                }}
              >
                {tag}
              </Badge>
            ))}
            {prompt.tags.length > (isMobile ? 2 : 3) && (
              <Badge 
                variant="outline" 
                className={`text-xs font-medium transition-all duration-300 border-primary/30 ${
                  isHovered ? 'scale-105 bg-primary/10' : ''
                }`}
              >
                +{prompt.tags.length - (isMobile ? 2 : 3)}
              </Badge>
            )}
          </div>
        )}

        <div className={`flex items-center gap-2 pt-3 border-t transition-all duration-300 ${
          isHovered ? 'border-primary/30' : 'border-border/30'
        }`}>
          <Button
            size={isMobile ? "sm" : "sm"}
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            disabled={isLoading}
            className={`flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground transition-all duration-300 shadow-md font-semibold ${
              isHovered ? 'shadow-lg scale-105 shadow-primary/30' : ''
            }`}
          >
            <Copy className="w-3 h-3 mr-2" />
            {isLoading ? 'Copiando...' : 'Copiar'}
          </Button>

          <Button
            size={isMobile ? "sm" : "sm"}
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onView(prompt);
            }}
            className={`border-primary/30 hover:honey-gradient hover:border-primary/50 transition-all duration-300 ${
              isHovered ? 'border-primary/50 shadow-sm scale-105 bg-primary/5' : ''
            }`}
          >
            <Eye className="w-3 h-3 text-primary" />
          </Button>

          <Button
            size={isMobile ? "sm" : "sm"}
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(prompt);
            }}
            className={`border-accent/40 hover:bg-accent/20 hover:border-accent/60 transition-all duration-300 ${
              isHovered ? 'border-accent/60 shadow-sm scale-105 bg-accent/10' : ''
            }`}
          >
            <Edit className="w-3 h-3 text-accent" />
          </Button>

          <Button
            size={isMobile ? "sm" : "sm"}
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(prompt.id);
            }}
            className={`border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-300 ${
              isHovered ? 'border-destructive shadow-sm scale-105 bg-destructive/10' : ''
            }`}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
