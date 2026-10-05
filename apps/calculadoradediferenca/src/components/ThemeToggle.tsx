import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Light
      </span>
      <button
        onClick={onToggle}
        className="relative w-14 h-7 bg-gray-300 dark:bg-gray-700 rounded-full transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label="Toggle theme"
      >
        <div
          className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white dark:bg-gray-900 rounded-full shadow-lg transform transition-all duration-300 ease-in-out flex items-center justify-center ${
            theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
          }`}
        >
          {theme === 'light' ? (
            <Sun className="w-3 h-3 text-yellow-500" />
          ) : (
            <Moon className="w-3 h-3 text-cyan-400" />
          )}
        </div>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 dark:opacity-100 transition-opacity duration-300" />
      </button>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
        Dark
      </span>
    </div>
  );
};

export default ThemeToggle;