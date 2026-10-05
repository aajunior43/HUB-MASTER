"use client";

import TodoList from "@/components/TodoList";
import Footer from "@/components/Footer";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle />
      </div>
      <main className="w-full flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <TodoList />
      </main>
      <Footer />
    </div>
  );
};

export default Index;