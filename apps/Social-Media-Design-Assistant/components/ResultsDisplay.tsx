import React from 'react';

interface ResultsDisplayProps {
  isLoading: boolean;
  loadingStep: string;
  error: string | null;
  generatedImage: string | null;
}

const LoadingState: React.FC<{ step: string }> = ({ step }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-lg h-full min-h-[500px]">
    <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-lg font-semibold text-white">A IA está trabalhando...</p>
    <p className="text-gray-400 mt-2 text-sm">{step}</p>
  </div>
);

const InitialState: React.FC = () => (
  <div className="flex flex-col items-center justify-center p-8 bg-gray-800 rounded-lg h-full min-h-[500px] border-2 border-dashed border-gray-700">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <p className="text-xl font-bold text-gray-300">Seus resultados aparecerão aqui</p>
    <p className="text-gray-500 mt-1 text-center max-w-sm">Preencha o formulário ao lado para começar a criar designs incríveis com inteligência artificial.</p>
  </div>
);

const ErrorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center p-8 bg-red-900/20 border border-red-500 text-red-300 rounded-lg h-full min-h-[500px]">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p className="text-lg font-semibold">Oops! Algo deu errado.</p>
    <p className="text-red-400 mt-1">{message}</p>
  </div>
);

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ isLoading, loadingStep, error, generatedImage }) => {
  if (isLoading) return <LoadingState step={loadingStep} />;
  if (error) return <ErrorState message={error} />;
  if (!generatedImage) return <InitialState />;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-white">Seu Design Gerado</h2>
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="mb-4 bg-black/20 rounded-lg flex items-center justify-center">
           <img 
            src={generatedImage} 
            alt="Design gerado pela IA" 
            className="rounded-md max-h-[60vh] w-auto object-contain"
          />
        </div>
        <a
          href={generatedImage}
          download="design_gerado_ia.jpeg"
          className="w-full max-w-xs mx-auto flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Baixar Arte
        </a>
      </div>
    </div>
  );
};