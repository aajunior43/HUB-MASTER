import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon,
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-2xl font-bold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed outline-none";
  
  // In Neomorphism, "Primary" often means the same shape but with colored text/icon or a subtle glow.
  // We use neo-flat for the shape.
  const variants = {
    primary: "neo-flat text-indigo-400 hover:text-indigo-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]",
    secondary: "neo-flat text-cyan-400 hover:text-cyan-300",
    outline: "neo-pressed text-slate-400 hover:text-slate-200", // "Outline" concept is better represented as "pressed/inset" or simpler flat
    ghost: "text-slate-500 hover:text-indigo-400 hover:bg-slate-800/50 rounded-lg",
  };

  // If loading, we simulate a pressed state
  const loadingClass = isLoading ? "neo-pressed opacity-80" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${loadingClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
