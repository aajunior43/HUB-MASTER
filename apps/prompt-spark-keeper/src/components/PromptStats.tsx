import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Target, 
  Calendar, 
  Tag, 
  Clock,
  PieChart,
  Activity
} from 'lucide-react';
import { Prompt } from '@/types/prompt';
import { useIsMobile } from '@/hooks/use-mobile';

interface PromptStatsProps {
  prompts: Prompt[];
}

export const PromptStats = ({ prompts }: PromptStatsProps) => {
  const isMobile = useIsMobile();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('month');

  const stats = useMemo(() => {
    const now = new Date();
    const getTimeframeDate = () => {
      switch (selectedTimeframe) {
        case 'week':
          return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'month':
          return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        default:
          return new Date(0);
      }
    };

    const timeframeDate = getTimeframeDate();
    const filteredPrompts = prompts.filter(prompt => 
      new Date(prompt.created_at) >= timeframeDate
    );

    // Estatísticas básicas
    const total = prompts.length;
    const recent = filteredPrompts.length;
    
    // Categorias mais populares
    const categoryCount = prompts.reduce((acc, prompt) => {
      const category = prompt.category || 'Sem categoria';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Tags mais usadas
    const tagCount = prompts.reduce((acc, prompt) => {
      prompt.tags?.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topTags = Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);

    // Atividade recente
    const last30Days = prompts.filter(prompt => 
      new Date(prompt.created_at) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    const last7Days = prompts.filter(prompt => 
      new Date(prompt.created_at) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    // Métricas de crescimento
    const avgContentLength = prompts.reduce((acc, prompt) => acc + prompt.content.length, 0) / total;
    const avgTagsPerPrompt = prompts.reduce((acc, prompt) => acc + (prompt.tags?.length || 0), 0) / total;

    return {
      total,
      recent,
      last30Days,
      last7Days,
      topCategories,
      topTags,
      avgContentLength: Math.round(avgContentLength),
      avgTagsPerPrompt: Math.round(avgTagsPerPrompt * 10) / 10,
      categoriesCount: Object.keys(categoryCount).length,
      uniqueTags: Object.keys(tagCount).length
    };
  }, [prompts, selectedTimeframe]);

  const timeframeOptions = [
    { value: 'week', label: '7 dias' },
    { value: 'month', label: '30 dias' },
    { value: 'all', label: 'Todos' }
  ];

  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-bg border border-primary/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold gradient-text">Analytics Dashboard</h2>
            <p className="text-sm text-muted-foreground">Insights sobre seus prompts</p>
          </div>
        </div>

        {/* Filtro de tempo */}
        <div className="flex gap-1 p-1 bg-muted/20 rounded-lg">
          {timeframeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedTimeframe(option.value as any)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                selectedTimeframe === option.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de métricas principais */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <Card className="glass-effect border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold text-primary">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Últimos 30d</p>
                <p className="text-lg font-bold text-accent">{stats.last30Days}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <PieChart className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Categorias</p>
                <p className="text-lg font-bold text-green-400">{stats.categoriesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Tag className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tags únicas</p>
                <p className="text-lg font-bold text-blue-400">{stats.uniqueTags}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de análises detalhadas */}
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {/* Categorias populares */}
        <Card className="glass-effect border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              Categorias Populares
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topCategories.map(([category, count], index) => {
              const percentage = (count / stats.total) * 100;
              return (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{count}</span>
                      <Badge variant="outline" className="text-xs">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-2"
                    style={{
                      background: `linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)`
                    }}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Tags populares */}
        <Card className="glass-effect border-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5 text-accent" />
              Tags Mais Usadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.topTags.map(([tag, count]) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="bg-accent/10 border-accent/30 text-accent-foreground relative overflow-hidden"
                >
                  <span className="relative z-10">{tag}</span>
                  <span className="ml-1 text-xs opacity-70">({count})</span>
                  <div 
                    className="absolute inset-0 bg-accent/20"
                    style={{ 
                      width: `${Math.min((count / Math.max(...stats.topTags.map(([, c]) => c))) * 100, 100)}%` 
                    }}
                  />
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Métricas de qualidade */}
        <Card className="glass-effect border-green-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Métricas de Qualidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tamanho médio do prompt</span>
              <span className="text-sm font-medium">{stats.avgContentLength} caracteres</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tags por prompt</span>
              <span className="text-sm font-medium">{stats.avgTagsPerPrompt} tags</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Atividade (7 dias)</span>
              <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400">
                {stats.last7Days} prompts
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Atividade recente */}
        <Card className="glass-effect border-blue-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Atividade Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Últimos 7 dias</span>
                <span className="text-sm font-medium text-blue-400">{stats.last7Days}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Últimos 30 dias</span>
                <span className="text-sm font-medium text-blue-400">{stats.last30Days}</span>
              </div>
              
              {stats.last30Days > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-blue-400 font-medium">
                      Você está ativo! {stats.last7Days > 0 ? '🚀' : '📈'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-300/80 mt-1">
                    {stats.last7Days > 0 
                      ? 'Continue criando prompts incríveis!'
                      : 'Que tal criar um novo prompt hoje?'
                    }
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};