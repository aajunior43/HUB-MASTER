import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  BarChart, 
  Code, 
  Briefcase, 
  MessageSquare, 
  Search, 
  Users, 
  BookOpen,
  Sparkles,
  Brain
} from "lucide-react";

const categories = [
  {
    id: "writing",
    name: "Escrita & Redação",
    icon: Edit,
    description: "Prompts para criação de textos, artigos e conteúdo escrito",
    count: 150,
    color: "from-pink-500 to-purple-600"
  },
  {
    id: "analysis",
    name: "Análise & Pesquisa",
    icon: BarChart,
    description: "Prompts para análise de dados, pesquisa e insights",
    count: 120,
    color: "from-blue-500 to-cyan-500"
  },
  {
    id: "coding",
    name: "Programação",
    icon: Code,
    description: "Prompts para desenvolvimento de software e resolução de problemas",
    count: 85,
    color: "from-green-500 to-emerald-600"
  },
  {
    id: "business",
    name: "Negócios",
    icon: Briefcase,
    description: "Prompts para estratégia, marketing e desenvolvimento empresarial",
    count: 95,
    color: "from-orange-500 to-red-500"
  },
  {
    id: "conversation",
    name: "Conversação",
    icon: MessageSquare,
    description: "Prompts para diálogos e interações conversacionais",
    count: 110,
    color: "from-violet-500 to-purple-600"
  },
  {
    id: "research",
    name: "Pesquisa",
    icon: Search,
    description: "Prompts para investigação acadêmica e revisão literária",
    count: 75,
    color: "from-indigo-500 to-blue-600"
  },
  {
    id: "education",
    name: "Educação",
    icon: Users,
    description: "Prompts para ensino, explicações e materiais educacionais",
    count: 90,
    color: "from-yellow-500 to-orange-500"
  },
  {
    id: "creative",
    name: "Criatividade",
    icon: BookOpen,
    description: "Prompts para brainstorming e geração de ideias criativas",
    count: 65,
    color: "from-teal-500 to-green-500"
  }
];

interface PromptCategoriesProps {
  onCategorySelect: (categoryId: string) => void;
  selectedCategory?: string;
}

export default function PromptCategories({ onCategorySelect, selectedCategory }: PromptCategoriesProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Categorias Disponíveis</span>
        </div>
        <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Escolha Sua Especialidade
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Selecione uma categoria para gerar prompts otimizados para sua área de interesse
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = selectedCategory === category.id;
          
          return (
            <Card
              key={category.id}
              className={`glass-card p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:glow-effect group ${
                isSelected ? 'ring-2 ring-primary glow-effect' : ''
              }`}
              onClick={() => onCategorySelect(category.id)}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-xl bg-gradient-to-br ${category.color} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
                
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  {category.count} prompts
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="text-center mt-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card">
          <Brain className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            Mais categorias sendo adicionadas semanalmente
          </span>
        </div>
      </div>
    </div>
  );
}