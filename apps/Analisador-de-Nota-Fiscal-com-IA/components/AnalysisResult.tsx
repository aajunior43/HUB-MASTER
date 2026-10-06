
import React from 'react';
import { AnalysisResult as AnalysisResultType, AnalysisDecision } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface AnalysisResultProps {
  result: AnalysisResultType;
}

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ result }) => {
  const isApproved = result.status === AnalysisDecision.DEFERIDO;

  return (
    <div className="w-full p-6 bg-gray-800/50 border border-gray-700 rounded-lg animate-fade-in">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {isApproved ? (
          <CheckCircleIcon className="w-16 h-16 text-green-400 flex-shrink-0" />
        ) : (
          <XCircleIcon className="w-16 h-16 text-red-400 flex-shrink-0" />
        )}
        <div className="text-center sm:text-left">
          <h2
            className={`text-2xl font-bold ${
              isApproved ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {result.status}
          </h2>
          <p className="text-gray-300 mt-1">{result.summary}</p>
        </div>
      </div>

      {!isApproved && result.issues && result.issues.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-white">Problemas Encontrados:</h3>
          <ul className="list-disc list-inside mt-2 space-y-2 text-gray-300">
            {result.issues.map((issue, index) => (
              <li key={index} className="bg-gray-700/50 p-3 rounded-md">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
