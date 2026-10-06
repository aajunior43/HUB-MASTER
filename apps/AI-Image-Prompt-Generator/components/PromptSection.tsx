import React from 'react';
import { OptionButton } from './OptionButton';

interface PromptSectionProps {
  title: string;
  options: string[];
  selection: string | null | Set<string>;
  onSelect: (option: string, isMultiSelect: boolean) => void;
  isMultiSelect?: boolean;
}

export const PromptSection: React.FC<PromptSectionProps> = ({ title, options, selection, onSelect, isMultiSelect = false }) => {
  return (
    <div className="glass-panel p-5 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-brand-light mb-4">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {options.map(option => {
          const isSelected = isMultiSelect 
            ? (selection as Set<string>).has(option) 
            : selection === option;
            
          return (
            <OptionButton
              key={option}
              label={option}
              isSelected={isSelected}
              onClick={() => onSelect(option, isMultiSelect)}
            />
          );
        })}
      </div>
    </div>
  );
};