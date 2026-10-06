"use client";

import React, { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Pencil, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Priority } from "@/hooks/useTodos";

interface TodoItemProps {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
  onUpdatePriority: (id: string, priority: Priority) => void;
}

const priorityConfig: Record<
  Priority,
  { label: string; color: string; dotColor: string }
> = {
  high: { label: "Alta", color: "border-red-500", dotColor: "bg-red-500" },
  medium: {
    label: "Média",
    color: "border-yellow-500",
    dotColor: "bg-yellow-500",
  },
  low: { label: "Baixa", color: "border-green-500", dotColor: "bg-green-500" },
  none: {
    label: "Nenhuma",
    color: "border-transparent",
    dotColor: "bg-gray-400",
  },
};

const TodoItem: React.FC<TodoItemProps> = ({
  id,
  text,
  completed,
  priority,
  onToggle,
  onDelete,
  onEdit,
  onUpdatePriority,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const handleSave = () => {
    if (editText.trim()) {
      onEdit(id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditText(text);
    setIsEditing(false);
  };

  const currentPriorityConfig = priorityConfig[priority];

  return (
    <>
      <div
        className={cn(
          "flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-l-4",
          currentPriorityConfig.color,
        )}
      >
        {isEditing ? (
          <div className="flex items-center space-x-2 flex-grow">
            <Input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="flex-grow"
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSave}
              className="text-green-500 hover:text-green-600"
            >
              <Save className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              className="text-red-500 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-4 min-w-0">
              <Checkbox
                id={`todo-${id}`}
                checked={completed}
                onCheckedChange={() => onToggle(id)}
              />
              <label
                htmlFor={`todo-${id}`}
                className={cn(
                  "text-lg font-medium leading-normal cursor-pointer break-words",
                  completed
                    ? "line-through text-muted-foreground"
                    : "text-foreground",
                )}
              >
                {text}
              </label>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0 pl-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="text-blue-500 hover:text-blue-600"
              >
                <Pencil className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsAlertOpen(true)}
                className="text-red-500 hover:text-red-600"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <span
                      className={cn(
                        "h-3 w-3 rounded-full",
                        currentPriorityConfig.dotColor,
                      )}
                    ></span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onUpdatePriority(id, "high")}>
                    Alta
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onUpdatePriority(id, "medium")}
                  >
                    Média
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdatePriority(id, "low")}>
                    Baixa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdatePriority(id, "none")}>
                    Nenhuma
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso excluirá permanentemente o
              seu afazer da lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onDelete(id)}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TodoItem;