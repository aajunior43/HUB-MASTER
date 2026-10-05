import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  Star,
  BarChart3,
  Search,
  Filter,
  Settings,
  Eye,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { promptTemplateService, PromptTemplate, TemplateCategory } from '@/services/promptTemplateService';
import { logger } from '@/utils/logger';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PromptTemplateManagerProps {
  onTemplateSelect?: (template: PromptTemplate) => void;
  selectedTemplateId?: string;
  className?: string;
}

export const PromptTemplateManager = ({ 
  onTemplateSelect, 
  selectedTemplateId, 
  className 
}: PromptTemplateManagerProps) => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<{
    name: string;
    description: string;
    category: 'fiscal' | 'juridico' | 'corporativo' | 'pessoal' | 'academico' | 'geral';
    fileTypes: string[];
    prompt: string;
  }>({
    name: '',
    description: '',
    category: 'geral',
    fileTypes: [],
    prompt: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setTemplates(promptTemplateService.getAllTemplates());
    setCategories(promptTemplateService.getCategories());
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const handleTemplateSelect = (template: PromptTemplate) => {
    promptTemplateService.recordUsage(template.id);
    loadData(); // Recarregar para atualizar contadores
    
    if (onTemplateSelect) {
      onTemplateSelect(template);
    }
    
    toast({
      title: "Template selecionado",
      description: `Template "${template.name}" foi aplicado.`,
    });
    
    setIsOpen(false);
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.prompt.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e prompt são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const template = promptTemplateService.createTemplate({
        name: newTemplate.name.trim(),
        description: newTemplate.description.trim(),
        category: newTemplate.category,
        fileTypes: newTemplate.fileTypes.length > 0 ? newTemplate.fileTypes : ['all'],
        prompt: newTemplate.prompt.trim()
      });

      loadData();
      setIsCreating(false);
      setNewTemplate({
        name: '',
        description: '',
        category: 'geral',
        fileTypes: [],
        prompt: ''
      });

      toast({
        title: "Template criado",
        description: `Template "${template.name}" foi criado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao criar template",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate || !newTemplate.name.trim() || !newTemplate.prompt.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e prompt são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      promptTemplateService.updateTemplate(editingTemplate.id, {
        name: newTemplate.name.trim(),
        description: newTemplate.description.trim(),
        category: newTemplate.category,
        fileTypes: newTemplate.fileTypes.length > 0 ? newTemplate.fileTypes : ['all'],
        prompt: newTemplate.prompt.trim()
      });

      loadData();
      setEditingTemplate(null);
      setNewTemplate({
        name: '',
        description: '',
        category: 'geral',
        fileTypes: [],
        prompt: ''
      });

      toast({
        title: "Template atualizado",
        description: "Template foi atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar template",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTemplate = (template: PromptTemplate) => {
    try {
      promptTemplateService.deleteTemplate(template.id);
      loadData();
      
      toast({
        title: "Template removido",
        description: `Template "${template.name}" foi removido.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao remover template",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateTemplate = (template: PromptTemplate) => {
    const duplicated = promptTemplateService.duplicateTemplate(template.id);
    if (duplicated) {
      loadData();
      toast({
        title: "Template duplicado",
        description: `Template "${duplicated.name}" foi criado.`,
      });
    }
  };

  const handleExportTemplates = () => {
    try {
      const exportData = promptTemplateService.exportCustomTemplates();
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `templates-prompts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Templates exportados",
        description: "Arquivo baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar os templates.",
        variant: "destructive"
      });
    }
  };

  const handleImportTemplates = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = promptTemplateService.importTemplates(content);
        
        loadData();
        
        toast({
          title: "Importação concluída",
          description: `${result.imported} template(s) importado(s), ${result.skipped} ignorado(s).`,
          variant: result.errors.length > 0 ? "destructive" : "default"
        });
        
        if (result.errors.length > 0) {
          console.error('Erros na importação:', result.errors);
        }
      } catch (error) {
        toast({
          title: "Erro ao importar",
          description: "Arquivo inválido ou corrompido.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const startEditing = (template: PromptTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      description: template.description,
      category: template.category,
      fileTypes: [...template.fileTypes],
      prompt: template.prompt
    });
    setActiveTab('create');
  };

  const cancelEditing = () => {
    setEditingTemplate(null);
    setIsCreating(false);
    setNewTemplate({
      name: '',
      description: '',
      category: 'geral',
      fileTypes: [],
      prompt: ''
    });
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || {
      id: categoryId,
      name: categoryId,
      description: '',
      icon: '📄',
      color: 'bg-gray-100 text-gray-800'
    };
  };

  const statistics = promptTemplateService.getUsageStatistics();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`glass-panel border-primary/20 hover:border-primary/40 transition-all duration-300 ${className}`}
        >
          <FileText className="h-4 w-4 mr-2" />
          Templates
          {templates.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {templates.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerenciador de Templates de Prompts
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="browse">Navegar</TabsTrigger>
            <TabsTrigger value="create">Criar/Editar</TabsTrigger>
            <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
            <TabsTrigger value="manage">Gerenciar</TabsTrigger>
          </TabsList>
          
          <TabsContent value="browse" className="space-y-4">
            {/* Filtros */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Badge variant="outline">
                {filteredTemplates.length} template(s)
              </Badge>
            </div>
            
            {/* Lista de Templates */}
            <ScrollArea className="h-[500px] w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTemplates.map((template) => {
                  const categoryInfo = getCategoryInfo(template.category);
                  const isSelected = selectedTemplateId === template.id;
                  
                  return (
                    <Card 
                      key={template.id} 
                      className={`glass-panel cursor-pointer transition-all duration-200 hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary' : 'border-primary/10'
                      }`}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{categoryInfo.icon}</span>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${categoryInfo.color}`}
                              >
                                {categoryInfo.name}
                              </Badge>
                              {template.isDefault && (
                                <Badge variant="outline" className="text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Padrão
                                </Badge>
                              )}
                            </div>
                            
                            <CardTitle className="text-base font-semibold mb-1">
                              {template.name}
                            </CardTitle>
                            
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            {template.usageCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {template.usageCount} uso(s)
                              </Badge>
                            )}
                            
                            <div className="flex gap-1">
                              {!template.isDefault && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditing(template);
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTemplate(template);
                                    }}
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicateTemplate(template);
                                }}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            Tipos: {template.fileTypes.includes('all') ? 'Todos' : template.fileTypes.join(', ')}
                          </span>
                          <span>
                            {formatDistanceToNow(template.updatedAt, { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {filteredTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum template encontrado</p>
                  <p className="text-sm">Tente ajustar os filtros ou criar um novo template</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="create" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {editingTemplate ? 'Editar Template' : 'Criar Novo Template'}
              </h3>
              
              <div className="flex gap-2">
                {(isCreating || editingTemplate) && (
                  <Button onClick={cancelEditing} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                )}
                
                {!isCreating && !editingTemplate && (
                  <Button onClick={() => setIsCreating(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Template
                  </Button>
                )}
              </div>
            </div>
            
            {(isCreating || editingTemplate) && (
              <ScrollArea className="h-[500px] w-full">
                <div className="space-y-4 pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Nome do Template *</Label>
                      <Input
                        id="template-name"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Notas Fiscais Personalizadas"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="template-category">Categoria</Label>
                      <Select 
                        value={newTemplate.category} 
                        onValueChange={(value: any) => setNewTemplate(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.icon} {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="template-description">Descrição</Label>
                    <Input
                      id="template-description"
                      value={newTemplate.description}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva quando usar este template"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Tipos de Arquivo Suportados</Label>
                    <div className="flex flex-wrap gap-2">
                      {['all', 'pdf', 'word', 'image'].map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`filetype-${type}`}
                            checked={newTemplate.fileTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewTemplate(prev => ({
                                  ...prev,
                                  fileTypes: [...prev.fileTypes.filter(t => t !== 'all'), type]
                                }));
                              } else {
                                setNewTemplate(prev => ({
                                  ...prev,
                                  fileTypes: prev.fileTypes.filter(t => t !== type)
                                }));
                              }
                            }}
                          />
                          <Label htmlFor={`filetype-${type}`} className="text-sm">
                            {type === 'all' ? 'Todos os tipos' : type.toUpperCase()}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="template-prompt">Prompt do Template *</Label>
                    <Textarea
                      id="template-prompt"
                      value={newTemplate.prompt}
                      onChange={(e) => setNewTemplate(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="Digite o prompt que será usado para analisar os documentos..."
                      className="min-h-[300px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Use [FILETYPE] como placeholder para o tipo de arquivo
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {editingTemplate ? 'Atualizar Template' : 'Criar Template'}
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}
            
            {!isCreating && !editingTemplate && (
              <div className="text-center py-12 text-muted-foreground">
                <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Clique em "Novo Template" para começar</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="statistics" className="space-y-4">
            <h3 className="text-lg font-semibold">Estatísticas de Uso</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{statistics.totalTemplates}</div>
                  <div className="text-sm text-muted-foreground">Total de Templates</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-500">{statistics.customTemplates}</div>
                  <div className="text-sm text-muted-foreground">Personalizados</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-500">{statistics.defaultTemplates}</div>
                  <div className="text-sm text-muted-foreground">Padrão</div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-500">{statistics.totalUsage}</div>
                  <div className="text-sm text-muted-foreground">Usos Totais</div>
                </CardContent>
              </Card>
            </div>
            
            {statistics.mostUsedTemplate && (
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-4 w-4" />
                    Template Mais Usado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{statistics.mostUsedTemplate.name}</span>
                    <Badge variant="outline">{statistics.mostUsedTemplate.usageCount} uso(s)</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4" />
                  Uso por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {statistics.categoryStats.map((stat) => (
                    <div key={stat.category} className="flex items-center justify-between">
                      <span className="text-sm">{stat.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {stat.templates} template(s)
                        </span>
                        <Badge variant="outline">{stat.usage} uso(s)</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="manage" className="space-y-4">
            <h3 className="text-lg font-semibold">Gerenciar Templates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={handleExportTemplates}
                variant="outline"
                className="flex items-center gap-2 h-auto p-4"
              >
                <Download className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Exportar Templates</div>
                  <div className="text-sm text-muted-foreground">Salvar templates personalizados</div>
                </div>
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportTemplates}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="import-templates"
                />
                <Button 
                  variant="outline"
                  className="w-full flex items-center gap-2 h-auto p-4"
                  asChild
                >
                  <label htmlFor="import-templates" className="cursor-pointer">
                    <Upload className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Importar Templates</div>
                      <div className="text-sm text-muted-foreground">Carregar templates salvos</div>
                    </div>
                  </label>
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Exportar:</strong> Salva apenas templates personalizados em arquivo JSON.</p>
              <p><strong>Importar:</strong> Carrega templates de um arquivo exportado anteriormente.</p>
              <p><strong>Nota:</strong> Templates padrão não podem ser editados ou removidos.</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PromptTemplateManager;