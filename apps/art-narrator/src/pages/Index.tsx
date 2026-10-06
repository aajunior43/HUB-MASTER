import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PromptGenerator from "@/components/PromptGenerator";
import SavedPrompts from "@/components/SavedPrompts";
import { 
  Brain,
  Heart,
  Share2,
  Github,
  Twitter
} from "lucide-react";

const Index = () => {
  const [showSavedPrompts, setShowSavedPrompts] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const handleBackToGenerator = () => {
    setShowSavedPrompts(false);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/20 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Prompt Narrator
              </h1>
            </div>

            <nav className="flex items-center gap-4">
              <button 
                onClick={() => setShowSavedPrompts(true)} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Heart className="w-4 h-4" />
                <span>Biblioteca</span>
              </button>
              <a href="https://github.com/aajunior43/art-narrator" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {showSavedPrompts ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Biblioteca de Prompts</h2>
              <Button 
                variant="outline" 
                onClick={handleBackToGenerator}
                className="border-border/30"
              >
                ← Voltar ao Gerador
              </Button>
            </div>
            <SavedPrompts />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Gerador de Prompts para LLMs</h2>
                <p className="text-muted-foreground">
                  Crie prompts detalhados e profissionais para obtenção de respostas de alta qualidade de LLMs
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleCategoryChange("writing")}
                  className={selectedCategory === "writing" ? "bg-primary/10 border-primary" : "border-border/30"}
                >
                  Escrita
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleCategoryChange("analysis")}
                  className={selectedCategory === "analysis" ? "bg-primary/10 border-primary" : "border-border/30"}
                >
                  Análise
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleCategoryChange("coding")}
                  className={selectedCategory === "coding" ? "bg-primary/10 border-primary" : "border-border/30"}
                >
                  Programação
                </Button>
              </div>
            </div>
            
            <PromptGenerator selectedCategory={selectedCategory} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/20 py-8 px-4 mt-12">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Prompt Narrator
              </span>
            </div>
            
            <p className="text-muted-foreground text-sm">
              Gerador inteligente de prompts para LLMs
            </p>
            
            <div className="flex items-center gap-4">
              <a href="https://github.com/aajunior43/art-narrator" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <button 
                onClick={() => setShowSavedPrompts(true)} 
                className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-sm"
              >
                <Heart className="w-4 h-4" />
                <span>Biblioteca</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;