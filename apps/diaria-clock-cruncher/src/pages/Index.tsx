
import { DailyAllowanceCalculator } from "@/components/DailyAllowanceCalculator";
import { ThemeToggle } from "@/components/ThemeToggle";

const Index = () => {
  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-background to-secondary/20">
      <ThemeToggle />
      <main className="flex-grow flex items-center justify-center p-4">
        <DailyAllowanceCalculator />
      </main>
      <footer className="w-full p-4 text-center text-sm text-muted-foreground">
        Dev Aleksandro Alves da Rocha Junior
      </footer>
    </div>
  );
};

export default Index;
