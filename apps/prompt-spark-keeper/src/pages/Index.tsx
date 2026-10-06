
import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { CategoryFilter } from '@/components/CategoryFilter';
import { PromptGrid } from '@/components/PromptGrid';
import { PromptModal } from '@/components/PromptModal';
import { PromptStats } from '@/components/PromptStats';
import { QuickActions } from '@/components/QuickActions';
import { AdvancedSearch } from '@/components/AdvancedSearch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePrompts } from '@/hooks/usePrompts';
import { Prompt, CreatePromptData } from '@/types/prompt';

const Index = () => {
  const { prompts, loading, createPrompt, createMultiplePrompts, updatePrompt, deletePrompt, searchPrompts } = usePrompts();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const [useAdvancedFilters, setUseAdvancedFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('prompts');
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    prompt?: Prompt;
  }>({
    isOpen: false,
    mode: 'create'
  });

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        prompts
          .map(p => p.category)
          .filter(category => category && category.trim() !== '')
      )
    );
    return uniqueCategories.sort();
  }, [prompts]);

  const displayedPrompts = useMemo(() => {
    if (useAdvancedFilters) {
      return filteredPrompts;
    }
    return searchPrompts(searchQuery, selectedCategory);
  }, [prompts, searchQuery, selectedCategory, searchPrompts, filteredPrompts, useAdvancedFilters]);

  const handleCreatePrompt = () => {
    setModalState({
      isOpen: true,
      mode: 'create'
    });
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      prompt
    });
  };

  const handleViewPrompt = (prompt: Prompt) => {
    setModalState({
      isOpen: true,
      mode: 'view',
      prompt
    });
  };

  const handleSavePrompt = async (data: CreatePromptData) => {
    if (modalState.mode === 'create') {
      await createPrompt(data);
    } else if (modalState.mode === 'edit' && modalState.prompt) {
      await updatePrompt(modalState.prompt.id, data);
    }
  };

  const handleMultipleSave = async (prompts: CreatePromptData[]) => {
    await createMultiplePrompts(prompts);
  };

  const handleAdvancedFilter = (filtered: Prompt[]) => {
    setFilteredPrompts(filtered);
    setUseAdvancedFilters(true);
  };

  const handleSimpleSearch = (query: string) => {
    setSearchQuery(query);
    setUseAdvancedFilters(false);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleDeletePrompt = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este prompt?')) {
      await deletePrompt(id);
    }
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      mode: 'create'
    });
  };

  return (
    <div className="min-h-screen gradient-bg honeycomb-bg">
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreatePrompt={handleCreatePrompt}
        prompts={prompts}
      />

      <main className="animate-fade-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border/30 bg-background/50 backdrop-blur-sm sticky top-16 z-40">
            <div className="container mx-auto px-4 sm:px-6">
              <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted/30">
                <TabsTrigger value="prompts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Prompts
                </TabsTrigger>
                <TabsTrigger value="analytics" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Analytics
                </TabsTrigger>
                <TabsTrigger value="tools" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Ferramentas
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="prompts" className="mt-0">
            <div className="container mx-auto px-4 sm:px-6 py-4">
              <AdvancedSearch
                prompts={prompts}
                onFilterChange={handleAdvancedFilter}
                onSimpleSearch={handleSimpleSearch}
                categories={categories}
              />
            </div>

            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            <PromptGrid
              prompts={displayedPrompts}
              onEditPrompt={handleEditPrompt}
              onDeletePrompt={handleDeletePrompt}
              onViewPrompt={handleViewPrompt}
              loading={loading}
            />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0">
            <PromptStats prompts={prompts} />
          </TabsContent>

          <TabsContent value="tools" className="mt-0">
            <div className="container mx-auto px-4 sm:px-6 py-6">
              <QuickActions
                prompts={prompts}
                onCreatePrompt={handleCreatePrompt}
                onRefresh={handleRefresh}
                onImportPrompts={handleMultipleSave}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <PromptModal
        prompt={modalState.prompt}
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSave={handleSavePrompt}
        onMultipleSave={handleMultipleSave}
        mode={modalState.mode}
      />
    </div>
  );
};

export default Index;
