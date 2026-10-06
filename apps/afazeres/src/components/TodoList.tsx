"use client";

import React, { useState, useMemo } from "react";
import TodoItem from "./TodoItem";
import AddTodoForm from "./AddTodoForm";
import BackupUploadButtons from "./BackupUploadButtons";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTodos, Priority } from "@/hooks/useTodos";
import { ListOrdered, List } from "lucide-react";

type FilterType = "all" | "active" | "completed";

const TodoList: React.FC = () => {
  const {
    todos,
    setTodos,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
    updateTodoPriority,
  } = useTodos();
  const [sortByPriority, setSortByPriority] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const priorityOrder: Record<Priority, number> = {
    high: 0,
    medium: 1,
    low: 2,
    none: 3,
  };

  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === "active") return !todo.completed;
      if (filter === "completed") return todo.completed;
      return true;
    });
  }, [todos, filter]);

  const sortedTodos = useMemo(() => {
    if (!sortByPriority) {
      return filteredTodos;
    }
    return [...filteredTodos].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
  }, [filteredTodos, sortByPriority]);

  const completedCount = useMemo(
    () => todos.filter((todo) => todo.completed).length,
    [todos],
  );

  return (
    <Card className="w-full max-w-md md:max-w-lg mx-auto shadow-xl rounded-xl overflow-hidden bg-white dark:bg-gray-800">
      <CardHeader className="bg-primary text-primary-foreground p-6">
        <CardTitle className="text-center text-3xl font-extrabold">
          Minha Lista de Afazeres
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <AddTodoForm onAddTodo={addTodo} />
        <Separator />
        <div className="flex flex-col sm:flex-row justify-between items-center p-2 gap-2">
          <ToggleGroup
            type="single"
            value={filter}
            onValueChange={(value) => {
              if (value) setFilter(value as FilterType);
            }}
            className="w-full sm:w-auto"
          >
            <ToggleGroupItem value="all" className="flex-1">
              Todos
            </ToggleGroupItem>
            <ToggleGroupItem value="active" className="flex-1">
              Ativos
            </ToggleGroupItem>
            <ToggleGroupItem value="completed" className="flex-1">
              Concluídos
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortByPriority(!sortByPriority)}
            className="w-full sm:w-auto"
          >
            {sortByPriority ? (
              <List className="mr-2 h-4 w-4" />
            ) : (
              <ListOrdered className="mr-2 h-4 w-4" />
            )}
            {sortByPriority ? "Ordem Padrão" : "Ordenar por Prioridade"}
          </Button>
        </div>
        <div className="divide-y divide-border min-h-[150px]">
          {sortedTodos.length === 0 ? (
            <p className="text-center text-lg text-muted-foreground p-6">
              Nenhum afazer encontrado.
            </p>
          ) : (
            sortedTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                id={todo.id}
                text={todo.text}
                completed={todo.completed}
                priority={todo.priority}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onEdit={editTodo}
                onUpdatePriority={updateTodoPriority}
              />
            ))
          )}
        </div>
        <Separator />
        <BackupUploadButtons todos={todos} setTodos={setTodos} />
      </CardContent>
      <CardFooter className="p-4 bg-muted/50 justify-center">
        <p className="text-sm font-medium text-muted-foreground">
          {completedCount} de {todos.length} tarefa(s) concluída(s)
        </p>
      </CardFooter>
    </Card>
  );
};

export default TodoList;