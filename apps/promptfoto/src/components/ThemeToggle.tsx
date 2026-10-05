 import { Moon, Sun } from "lucide-react";
 import { useEffect, useState } from "react";
 
 export const ThemeToggle = () => {
   const [isDark, setIsDark] = useState(false);
 
   useEffect(() => {
     const root = window.document.documentElement;
     const initialColorValue = root.classList.contains("dark");
     setIsDark(initialColorValue);
   }, []);
 
   const toggleTheme = () => {
     const root = window.document.documentElement;
     const newTheme = !isDark;
     setIsDark(newTheme);
     if (newTheme) {
       root.classList.add("dark");
       localStorage.setItem("theme", "dark");
     } else {
       root.classList.remove("dark");
       localStorage.setItem("theme", "light");
     }
   };
 
   return (
     <button
       onClick={toggleTheme}
       className="neo-button w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
       aria-label="Alternar tema"
     >
       {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
     </button>
   );
 };