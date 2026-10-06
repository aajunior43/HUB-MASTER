
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800/30 border-t border-gray-700 mt-8">
      <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-400">
          Desenvolvido com a API Gemini. © {new Date().getFullYear()} Assistente de Design IA. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
};
