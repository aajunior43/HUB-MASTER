import { MadeWithDyad } from "@/components/made-with-dyad";
import { CyberpunkCalendar } from "@/components/CyberpunkCalendar";
import { DigitalClock } from "@/components/DigitalClock";
import React from "react";

const Index = () => {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 animate-pulse-slow">
          ALEKSANDRO ALVES
        </h1>
      </div>
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-screen-lg mx-auto"> {/* Novo contêiner flexível */}
        <DigitalClock className="w-full md:w-1/2" /> {/* Ocupa metade da largura em telas maiores */}
        <CyberpunkCalendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          className="w-full md:w-1/2" // Ocupa metade da largura em telas maiores
        />
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;