import { memo } from "react";
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { LinkItem } from "./LinkItem";
import { Card } from "./ui/card";
import { ThemeData } from "@/types/theme";

interface LinkData {
  id: string;
  title: string;
  url: string;
  position: number;
  is_active?: boolean;
  profile_id: string;
}

interface LinksListProps {
  links: LinkData[];
  onDragEnd: (event: DragEndEvent) => void;
  onDeleteLink: (id: string) => void;
  onEditLink: (id: string, title: string, url: string) => void;
  theme?: ThemeData | null;
  sensors: any;
}

export const LinksList = memo(({ links, onDragEnd, onDeleteLink, onEditLink, theme, sensors }: LinksListProps) => {
  const linkIds = links.map(link => link.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={linkIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {links.map((link) => (
            <LinkItem
              key={link.id}
              id={link.id}
              title={link.title}
              url={link.url}
              onDelete={() => onDeleteLink(link.id)}
              onEdit={onEditLink}
              isEditable
              theme={theme}
            />
          ))}
          {links.length === 0 && (
            <Card className="p-8 glass border-border/50 text-center">
              <p className="text-muted-foreground">
                Nenhum link adicionado ainda. Comece adicionando seu primeiro link!
              </p>
            </Card>
          )}
        </div>
      </SortableContext>
    </DndContext>
  );
});

LinksList.displayName = "LinksList";