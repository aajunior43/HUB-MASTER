"use client";

import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface BackupUploadButtonsProps {
  todos: Todo[];
  setTodos: React.Dispatch<React.SetStateAction<Todo[]>>;
}

const BackupUploadButtons: React.FC<BackupUploadButtonsProps> = ({
  todos,
  setTodos,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    try {
      const json = JSON.stringify(todos, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "todos_backup.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess("Backup da lista de afazeres realizado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer backup:", error);
      showError("Falha ao realizar backup da lista de afazeres.");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const uploadedTodos: Todo[] = JSON.parse(content);

          // Basic validation to ensure it's an array of objects with expected properties
          if (
            Array.isArray(uploadedTodos) &&
            uploadedTodos.every(
              (todo) =>
                typeof todo.id === "string" &&
                typeof todo.text === "string" &&
                typeof todo.completed === "boolean",
            )
          ) {
            setTodos(uploadedTodos);
            showSuccess("Lista de afazeres carregada com sucesso!");
          } else {
            throw new Error("Formato de arquivo JSON inválido para afazeres.");
          }
        } catch (error) {
          console.error("Erro ao carregar arquivo:", error);
          showError(
            error instanceof Error
              ? error.message
              : "Falha ao carregar lista de afazeres. Verifique o formato do arquivo.",
          );
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-center gap-4 p-4">
      <Button
        onClick={handleBackup}
        variant="outline"
        className="w-full sm:w-auto"
      >
        <Download className="mr-2 h-4 w-4" /> Backup (JSON)
      </Button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json"
        className="hidden"
      />
      <Button
        onClick={handleUploadClick}
        variant="outline"
        className="w-full sm:w-auto"
      >
        <Upload className="mr-2 h-4 w-4" /> Upload (JSON)
      </Button>
    </div>
  );
};

export default BackupUploadButtons;