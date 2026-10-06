import React from 'react';

interface QueryInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const QueryInput: React.FC<QueryInputProps> = ({ value, onChange, onSubmit, isLoading }) => (
  <div>
    <label htmlFor="dork-query">
      <h3>Seu Objetivo de Busca</h3>
    </label>
    <textarea
      id="dork-query"
      style={{ width: '100%', minHeight: '90px' }}
      placeholder="Ex: Encontrar planilhas com informações financeiras em sites governamentais..."
      value={value}
      onChange={onChange}
      disabled={isLoading}
    />
    <br />
    <button
      onClick={onSubmit}
      disabled={isLoading}
    >
      {isLoading ? 'Gerando...' : 'Gerar Dork'}
    </button>
  </div>
);