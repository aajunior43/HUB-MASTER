
import { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tag } from '@/hooks/useTags';

interface TagInputProps {
  selectedTags: Tag[];
  availableTags: Tag[];
  onTagAdd: (tagName: string) => Promise<Tag | null>;
  onTagRemove: (tagId: string) => void;
  onTagSelect: (tag: Tag) => void;
  placeholder?: string;
}

export const TagInput = ({
  selectedTags,
  availableTags,
  onTagAdd,
  onTagRemove,
  onTagSelect,
  placeholder = "Adicionar tag..."
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const filteredSuggestions = availableTags.filter(tag => 
    tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
    !selectedTags.some(selected => selected.id === tag.id)
  );

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() && !isCreating) {
      e.preventDefault();
      setIsCreating(true);
      try {
        const newTag = await onTagAdd(inputValue.trim());
        if (newTag) {
          onTagSelect(newTag);
          setInputValue('');
          setShowSuggestions(false);
        }
      } finally {
        setIsCreating(false);
      }
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (tag: Tag) => {
    onTagSelect(tag);
    setInputValue('');
    setShowSuggestions(false);
  };

  const handleAddClick = async () => {
    if (inputValue.trim() && !isCreating) {
      setIsCreating(true);
      try {
        const newTag = await onTagAdd(inputValue.trim());
        if (newTag) {
          onTagSelect(newTag);
          setInputValue('');
          setShowSuggestions(false);
        }
      } finally {
        setIsCreating(false);
      }
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map(tag => (
            <Badge 
              key={tag.id}
              className="font-mono text-xs bg-black border"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              #{tag.name}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onTagRemove(tag.id)}
                className="h-3 w-3 p-0 ml-1 hover:bg-transparent"
              >
                <X className="h-2 w-2" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="bg-black border-green-400/30 text-green-400 font-mono text-sm"
            disabled={isCreating}
          />
          {inputValue.trim() && (
            <Button
              size="sm"
              onClick={handleAddClick}
              disabled={isCreating}
              className="bg-green-600 hover:bg-green-700 text-black font-mono"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-green-400/30 rounded-md shadow-lg z-50 max-h-32 overflow-y-auto">
            {filteredSuggestions.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleSuggestionClick(tag)}
                className="w-full px-3 py-2 text-left text-sm font-mono hover:bg-green-400/10 border-b border-green-400/10 last:border-b-0"
                style={{ color: tag.color }}
              >
                #{tag.name} ({tag.count})
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
