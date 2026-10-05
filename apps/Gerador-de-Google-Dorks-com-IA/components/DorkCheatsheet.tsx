
import React from 'react';
import { dorks } from '../constants';

export const DorkCheatsheet: React.FC = () => (
  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 h-full">
    <h3 className="text-xl font-semibold mb-4 text-cyan-300">Referência Rápida de Dorks</h3>
    <ul className="space-y-3 text-sm">
      {dorks.map((dork, index) => (
        <li key={index}>
          <p className="font-mono text-teal-400 bg-slate-900/50 inline-block px-2 py-1 rounded">
            {dork.operator}
          </p>
          <p className="text-slate-400 mt-1">{dork.description}</p>
        </li>
      ))}
    </ul>
  </div>
);
