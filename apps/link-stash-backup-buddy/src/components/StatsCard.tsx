import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Star, FolderOpen, Tag as TagIcon, TrendingUp, Hash } from 'lucide-react';

interface Link {
  id: string;
  title: string;
  url: string;
  created_at: string;
  category_id?: string;
  is_favorite: boolean;
  tagIds?: string[];
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface StatsCardProps {
  links: Link[];
  categories: Category[];
  tags: Tag[];
}

export const StatsCard = ({ links, categories, tags }: StatsCardProps) => {
  const [linksPerMonth, setLinksPerMonth] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);

  useEffect(() => {
    // Calculate links per month
    const monthData: { [key: string]: number } = {};
    links.forEach(link => {
      const date = new Date(link.created_at);
      const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
      monthData[monthKey] = (monthData[monthKey] || 0) + 1;
    });

    const sortedMonths = Object.entries(monthData)
      .sort(([a], [b]) => {
        const [monthA, yearA] = a.split('/').map(Number);
        const [monthB, yearB] = b.split('/').map(Number);
        return new Date(yearA, monthA - 1).getTime() - new Date(yearB, monthB - 1).getTime();
      })
      .slice(-6) // Last 6 months
      .map(([month, count]) => ({ month, count }));

    setLinksPerMonth(sortedMonths);

    // Calculate category stats
    const categoryData = categories.map(category => {
      const count = links.filter(link => link.category_id === category.id).length;
      return {
        name: category.name,
        count,
        color: getCategoryColor(category.color)
      };
    }).filter(cat => cat.count > 0);

    // Add uncategorized if any
    const uncategorized = links.filter(link => !link.category_id).length;
    if (uncategorized > 0) {
      categoryData.push({
        name: 'Sem Categoria',
        count: uncategorized,
        color: '#64748b'
      });
    }

    setCategoryStats(categoryData);
  }, [links, categories]);

  const getCategoryColor = (color: string) => {
    const colorMap: Record<string, string> = {
      green: '#22c55e',
      blue: '#3b82f6',
      cyan: '#06b6d4',
      yellow: '#eab308',
      magenta: '#d946ef',
      red: '#ef4444',
      orange: '#f97316',
      purple: '#8b5cf6',
      pink: '#ec4899',
      lime: '#84cc16',
      indigo: '#6366f1',
      teal: '#14b8a6',
      gray: '#6b7280',
      white: '#f8fafc',
    };
    return colorMap[color] || '#22c55e';
  };

  const totalLinks = links.length;
  const favoriteLinks = links.filter(link => link.is_favorite).length;
  const categorizedLinks = links.filter(link => link.category_id).length;
  const taggedLinks = links.filter(link => link.tagIds && link.tagIds.length > 0).length;

  // Get most recent links
  const recentLinks = links
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3);

  // Get most used domains
  const domainStats: { [key: string]: number } = {};
  links.forEach(link => {
    try {
      const domain = new URL(link.url).hostname.replace('www.', '');
      domainStats[domain] = (domainStats[domain] || 0) + 1;
    } catch {
      // Invalid URL
    }
  });

  const topDomains = Object.entries(domainStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  return (
    <Card className="cyber-bg cyber-border animate-fade-in cyber-glow">
      <CardHeader className="pb-4">
        <CardTitle className="cyber-title flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <span className="text-primary mr-1">{'>'}</span>
          ESTATÍSTICAS DO SISTEMA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-background/50 border border-primary/30 rounded-lg p-3 text-center cyber-hover">
            <div className="text-2xl font-bold text-primary cyber-text-glow">{totalLinks}</div>
            <div className="text-xs text-muted-foreground font-terminal">LINKS TOTAIS</div>
          </div>
          <div className="bg-background/50 border border-yellow-400/30 rounded-lg p-3 text-center cyber-hover">
            <div className="text-2xl font-bold text-yellow-400">{favoriteLinks}</div>
            <div className="text-xs text-muted-foreground font-terminal">FAVORITOS</div>
          </div>
          <div className="bg-background/50 border border-purple-400/30 rounded-lg p-3 text-center cyber-hover">
            <div className="text-2xl font-bold text-purple-400">{categories.length}</div>
            <div className="text-xs text-muted-foreground font-terminal">CATEGORIAS</div>
          </div>
          <div className="bg-background/50 border border-cyan-400/30 rounded-lg p-3 text-center cyber-hover">
            <div className="text-2xl font-bold text-cyan-400">{tags.length}</div>
            <div className="text-xs text-muted-foreground font-terminal">TAGS</div>
          </div>
        </div>

        {/* Charts */}
        {linksPerMonth.length > 0 && (
          <div className="space-y-3">
            <h4 className="cyber-subtitle flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              LINKS POR MÊS
            </h4>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={linksPerMonth}>
                  <XAxis 
                    dataKey="month" 
                    fontSize={10} 
                    tick={{ fill: 'hsl(var(--neon-green-dim))' }}
                  />
                  <YAxis 
                    fontSize={10} 
                    tick={{ fill: 'hsl(var(--neon-green-dim))' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--neon-green))" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Category Distribution */}
        {categoryStats.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="cyber-subtitle flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                DISTRIBUIÇÃO POR CATEGORIA
              </h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={50}
                      paddingAngle={2}
                    >
                      {categoryStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Domains */}
            <div className="space-y-3">
              <h4 className="cyber-subtitle flex items-center gap-2">
                <Hash className="h-4 w-4" />
                DOMÍNIOS MAIS USADOS
              </h4>
              <div className="space-y-2">
                {topDomains.map((domain, index) => (
                  <div key={domain.domain} className="flex justify-between items-center text-xs">
                    <span className="text-primary truncate font-terminal">{domain.domain}</span>
                    <span className="text-muted-foreground font-terminal">{domain.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {recentLinks.length > 0 && (
          <div className="space-y-3">
            <h4 className="cyber-subtitle flex items-center gap-2">
              <Star className="h-4 w-4" />
              LINKS RECENTES
            </h4>
            <div className="space-y-2">
              {recentLinks.map(link => (
                <div key={link.id} className="flex justify-between items-center text-xs border-l-2 border-primary/30 pl-3 py-1">
                  <span className="text-primary truncate font-terminal">{link.title}</span>
                  <span className="text-muted-foreground font-terminal text-xs">
                    {new Date(link.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};