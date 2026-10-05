import { ExternalLink, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EditLinkDialog } from "@/components/EditLinkDialog";
import { DeleteLinkDialog } from "@/components/DeleteLinkDialog";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo, useMemo, useCallback } from 'react';
import { ThemeData } from "@/types/theme";

interface LinkItemProps {
  id?: string;
  title: string;
  url: string;
  onDelete?: () => void;
  onEdit?: (id: string, title: string, url: string) => void;
  isEditable?: boolean;
  theme?: ThemeData;
}

export const LinkItem = memo(({ id, title, url, onDelete, onEdit, isEditable, theme }: LinkItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: id || '' });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }), [transform, transition, isDragging]);

  const handleClick = useCallback(() => {
    if (!isEditable) {
      window.open(url, "_blank");
    }
  }, [isEditable, url]);

  const buttonStyle = useMemo(() => {
    if (!theme || isEditable) return {};
    
    return {
      backgroundColor: theme.button_color || "#3b82f6",
      color: theme.text_color || "#ffffff",
      fontFamily: theme.font_family || "inter",
      boxShadow: theme.button_shadow || "none",
      border: theme.button_border || "none",
      borderRadius: theme.border_radius ? `${theme.border_radius}px` : "8px",
    } as React.CSSProperties;
  }, [theme, isEditable]);

  const buttonClass = useMemo(() => {
    if (!theme || isEditable) return "p-4 glass border-border/50 hover:border-primary/50 transition-all duration-300";
    
    let baseClass = "p-4 transition-all duration-300 w-full text-left";
    
    // Apply button style
    switch (theme.button_style) {
      case "rounded":
        baseClass += " rounded-lg";
        break;
      case "square":
        baseClass += " rounded-none";
        break;
      case "pill":
        baseClass += " rounded-full";
        break;
      case "sharp":
        baseClass += " rounded-sm";
        break;
      default:
        baseClass += " rounded-lg";
    }

    // Apply animation style
    switch (theme.animation_style) {
      case "hover-scale":
        baseClass += " hover-scale";
        break;
      case "hover-glow":
        baseClass += " hover-glow";
        break;
      case "hover-bounce":
        baseClass += " hover-bounce";
        break;
      case "hover-lift":
        baseClass += " hover-lift";
        break;
      case "hover-rotate":
        baseClass += " hover-rotate";
        break;
      case "hover-slide":
        baseClass += " hover-slide";
        break;
      case "gradient-shift":
        baseClass += " gradient-shift";
        break;
      case "shimmer":
        baseClass += " animate-shimmer";
        break;
      case "breathing":
        baseClass += " animate-breathing";
        break;
      case "magnetic":
        baseClass += " animate-magnetic";
        break;
      case "pulse":
        baseClass += " animate-pulse-glow";
        break;
      case "float":
        baseClass += " animate-float";
        break;
      case "rotate-subtle":
        baseClass += " animate-rotate-subtle";
        break;
      case "slide-in":
        baseClass += " animate-slide-in";
        break;
      default:
        break;
    }

    return baseClass;
  }, [theme, isEditable]);

  const handleEdit = useCallback((id: string, title: string, url: string) => {
    onEdit?.(id, title, url);
  }, [onEdit]);

  const handleDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  if (isEditable) {
    return (
      <Card
        ref={setNodeRef}
        style={style}
        className="p-5 glass-card border-border/50 hover:border-primary/50 transition-all duration-300 hover-lift group"
      >
        <div className="flex items-center gap-4">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing hover-scale"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate text-base">{title}</h3>
            <p className="text-sm text-muted-foreground truncate">{url}</p>
          </div>

          <div className="flex gap-2">
            {id && onEdit && (
              <EditLinkDialog
                link={{ id, title, url }}
                onEdit={handleEdit}
              />
            )}
            
            <DeleteLinkDialog
               linkTitle={title}
               onDelete={handleDelete}
             />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <button
      className={buttonClass}
      style={buttonStyle}
      onClick={handleClick}
      aria-label={`Abrir link: ${title}`}
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex-1 min-w-0 text-left">
          <h3 className="font-semibold truncate">{title}</h3>
        </div>
        <ExternalLink className="h-4 w-4 ml-2 flex-shrink-0" aria-hidden="true" />
      </div>
    </button>
  );
});

LinkItem.displayName = 'LinkItem';
