import { List, type RowComponentProps } from 'react-window';
import { LinkListItem } from './LinkListItem';

interface VirtualLink {
  id: string;
  title: string;
  url: string;
  created_at: string;
  category_id?: string;
  folder_id?: string | null;
  is_favorite?: boolean;
}

interface VirtualizedLinkListProps {
  links: VirtualLink[];
  onRemove: (id: string) => void;
  onEdit: (link: any) => void;
  onUpdate: (linkId: string, updates: any) => void;
  isSelectionMode: boolean;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  height: number;
  rowHeight: number;
}

interface RowProps {
  links: VirtualLink[];
  onRemove: (id: string) => void;
  onEdit: (link: any) => void;
  onUpdate: (linkId: string, updates: any) => void;
  isSelectionMode: boolean;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
}

function Row({ index, style, links, onRemove, onEdit, onUpdate, isSelectionMode, selectedIds, onToggleSelection }: RowComponentProps<RowProps>) {
  const link = links[index];
  return (
    <div style={style} className="px-0.5 pb-1.5">
      {link && (
        <LinkListItem
          link={{ ...link, createdAt: link.created_at, categoryId: link.category_id }}
          onRemove={onRemove}
          onEdit={onEdit}
          onUpdate={onUpdate}
          isSelected={selectedIds.includes(link.id)}
          isSelectionMode={isSelectionMode}
          onToggleSelection={() => onToggleSelection(link.id)}
        />
      )}
    </div>
  );
}

export const VirtualizedLinkList = ({
  links,
  onRemove,
  onEdit,
  onUpdate,
  isSelectionMode,
  selectedIds,
  onToggleSelection,
  height,
  rowHeight,
}: VirtualizedLinkListProps) => {
  const rowProps = { links, onRemove, onEdit, onUpdate, isSelectionMode, selectedIds, onToggleSelection };

  return (
    <div style={{ height, width: '100%' }}>
      <List
        rowComponent={Row}
        rowCount={links.length}
        rowHeight={rowHeight}
        rowProps={rowProps}
        overscanCount={4}
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
};
