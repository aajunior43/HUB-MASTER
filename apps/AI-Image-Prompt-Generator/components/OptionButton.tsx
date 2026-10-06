import React from 'react';

interface OptionButtonProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

export const OptionButton: React.FC<OptionButtonProps> = ({ label, isSelected, onClick }) => {
  const baseClasses = "px-4 py-2 text-sm font-semibold rounded-full shadow-sm focus:outline-none transition-all duration-200 transform hover:scale-105 focus-ring-brand";
  const selectedClasses = "bg-brand-accent text-white shadow-lg shadow-brand-accent/30";
  const unselectedClasses = "bg-brand-secondary text-brand-text hover:bg-gray-600";

  return (
    <button
      type="button"
      className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};