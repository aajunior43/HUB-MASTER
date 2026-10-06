
import { Badge } from '@/components/ui/badge';
import { Tag } from '@/hooks/useTags';

interface TagCloudProps {
  tags: Tag[];
  selectedTagIds: string[];
  onTagClick: (tagId: string) => void;
  maxTags?: number;
}

export const TagCloud = ({ 
  tags, 
  selectedTagIds, 
  onTagClick, 
  maxTags = 20 
}: TagCloudProps) => {
  const sortedTags = [...tags]
    .filter(tag => tag.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxTags);

  const maxCount = Math.max(...sortedTags.map(tag => tag.count));
  const minCount = Math.min(...sortedTags.map(tag => tag.count));

  const getFontSize = (count: number) => {
    if (maxCount === minCount) return 'text-sm';
    const ratio = (count - minCount) / (maxCount - minCount);
    if (ratio > 0.8) return 'text-lg';
    if (ratio > 0.6) return 'text-base';
    if (ratio > 0.4) return 'text-sm';
    return 'text-xs';
  };

  if (sortedTags.length === 0) {
    return (
      <div className="text-center py-4 text-green-300/50 font-mono text-sm">
        NENHUMA TAG ENCONTRADA
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {sortedTags.map(tag => {
        const isSelected = selectedTagIds.includes(tag.id);
        return (
          <Badge
            key={tag.id}
            className={`cursor-pointer font-mono transition-all hover:scale-105 ${getFontSize(tag.count)} ${
              isSelected 
                ? 'bg-opacity-20 border-2' 
                : 'bg-black border hover:bg-opacity-10'
            }`}
            style={{ 
              borderColor: tag.color, 
              color: tag.color,
              backgroundColor: isSelected ? `${tag.color}20` : 'black'
            }}
            onClick={() => onTagClick(tag.id)}
          >
            #{tag.name} ({tag.count})
          </Badge>
        );
      })}
    </div>
  );
};
