"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Priority } from "@/hooks/useTodos";

interface AddTodoFormProps {
  onAddTodo: (text: string, priority: Priority) => void;
}

const AddTodoForm: React.FC<AddTodoFormProps> = ({ onAddTodo }) => {
  const [inputText, setInputText] = useState("");
  const [priority, setPriority] = useState<Priority>("none");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onAddTodo(inputText.trim(), priority);
      setInputText("");
      setPriority("none");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center flex-wrap gap-2 p-4"
    >
      <Input
        type="text"
        placeholder="Adicionar novo afazer..."
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        className="flex-grow min-w-[150px]"
      />
      <Select
        value={priority}
        onValueChange={(value) => setPriority(value as Priority)}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Prioridade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhuma</SelectItem>
          <SelectItem value="low">Baixa</SelectItem>
          <SelectItem value="medium">Média</SelectItem>
          <SelectItem value="high">Alta</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit">
        <PlusCircle className="h-4 w-4" />
      </Button>
    </form>
  );
};

export default AddTodoForm;