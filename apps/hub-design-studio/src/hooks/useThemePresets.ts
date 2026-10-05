import { useState, useEffect, useMemo } from 'react';

interface ThemePreset {
  name: string;
  value: string;
  category: string;
}

const gradientPresets: ThemePreset[] = [
  // Vibrant & Modern
  { name: "Roxo/Rosa", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", category: "vibrant" },
  { name: "Azul/Ciano", value: "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)", category: "vibrant" },
  { name: "Verde/Lima", value: "linear-gradient(135deg, #56ccf2 0%, #2f80ed 100%)", category: "vibrant" },
  { name: "Laranja/Rosa", value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", category: "vibrant" },
  { name: "Neon", value: "linear-gradient(135deg, #12c2e9 0%, #c471ed 50%, #f64f59 100%)", category: "vibrant" },
  { name: "Cosmic", value: "linear-gradient(135deg, #667db6 0%, #0082c8 50%, #0082c8 100%, #667db6 100%)", category: "vibrant" },
  { name: "Holográfico", value: "linear-gradient(45deg, #ff0080, #ff8c00, #40e0d0, #ff0080)", category: "vibrant" },
  { name: "Cyberpunk", value: "linear-gradient(135deg, #ff006e 0%, #8338ec 50%, #3a86ff 100%)", category: "vibrant" },
  
  // Premium & Luxury
  { name: "Ouro Rosa", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", category: "luxury" },
  { name: "Platina", value: "linear-gradient(135deg, #e6e6e6 0%, #ffffff 50%, #e6e6e6 100%)", category: "luxury" },
  { name: "Champagne", value: "linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%)", category: "luxury" },
  { name: "Diamante", value: "linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #74b9ff 100%)", category: "luxury" },
  { name: "Esmeralda", value: "linear-gradient(135deg, #00b894 0%, #00cec9 100%)", category: "luxury" },
  { name: "Rubi", value: "linear-gradient(135deg, #e17055 0%, #d63031 100%)", category: "luxury" },
  
  // Dark & Sophisticated
  { name: "Noite", value: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)", category: "dark" },
  { name: "Oceano Profundo", value: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)", category: "dark" },
  { name: "Floresta Escura", value: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)", category: "dark" },
  { name: "Meia-Noite", value: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)", category: "dark" },
  { name: "Tempestade", value: "linear-gradient(135deg, #232526 0%, #414345 100%)", category: "dark" },
  { name: "Obsidiana", value: "linear-gradient(135deg, #000000 0%, #434343 100%)", category: "dark" },
  
  // Soft & Elegant
  { name: "Aurora", value: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)", category: "soft" },
  { name: "Lavanda", value: "linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)", category: "soft" },
  { name: "Mint", value: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)", category: "soft" },
  { name: "Pêssego", value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)", category: "soft" },
  { name: "Algodão Doce", value: "linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)", category: "soft" },
  { name: "Cristal", value: "linear-gradient(135deg, #e0c3fc 0%, #9bb5ff 100%)", category: "soft" },
  
  // Warm & Energetic
  { name: "Sunset", value: "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)", category: "warm" },
  { name: "Fogo", value: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)", category: "warm" },
  { name: "Vulcão", value: "linear-gradient(135deg, #ff512f 0%, #dd2476 100%)", category: "warm" },
  { name: "Dourado", value: "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)", category: "warm" },
  { name: "Coral", value: "linear-gradient(135deg, #ff9a8b 0%, #a8e6cf 100%)", category: "warm" },
  { name: "Tropical", value: "linear-gradient(135deg, #ff8a80 0%, #ffcc02 100%)", category: "warm" },
];

const solidColors: ThemePreset[] = [
  { name: "Azul Profundo", value: "#1e40af", category: "solid" },
  { name: "Verde Esmeralda", value: "#059669", category: "solid" },
  { name: "Roxo Real", value: "#7c3aed", category: "solid" },
  { name: "Vermelho Rubi", value: "#dc2626", category: "solid" },
  { name: "Laranja Vibrante", value: "#ea580c", category: "solid" },
  { name: "Rosa Choque", value: "#ec4899", category: "solid" },
  { name: "Preto Elegante", value: "#111827", category: "solid" },
  { name: "Cinza Moderno", value: "#374151", category: "solid" },
  { name: "Dourado Luxo", value: "#d4af37", category: "solid" },
  { name: "Prata Premium", value: "#c0c0c0", category: "solid" },
  { name: "Azul Safira", value: "#0f52ba", category: "solid" },
  { name: "Verde Jade", value: "#00a86b", category: "solid" },
  { name: "Violeta Imperial", value: "#663399", category: "solid" },
  { name: "Coral Vivo", value: "#ff7f50", category: "solid" },
  { name: "Turquesa", value: "#40e0d0", category: "solid" },
  { name: "Magenta", value: "#ff00ff", category: "solid" },
];

export const useThemePresets = () => {
  const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const loadCategory = async (category: string) => {
    if (loadedCategories.has(category)) return;
    
    setIsLoading(true);
    // Simulate async loading with a small delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    setLoadedCategories(prev => new Set([...prev, category]));
    setIsLoading(false);
  };

  const getGradientsByCategory = useMemo(() => {
    return (category: string) => {
      if (!loadedCategories.has(category)) return [];
      return gradientPresets.filter(preset => preset.category === category);
    };
  }, [loadedCategories]);

  const getSolidColors = () => {
    if (!loadedCategories.has('solid')) return [];
    return solidColors;
  };

  const getAllGradients = useMemo(() => {
    return gradientPresets.filter(preset => loadedCategories.has(preset.category));
  }, [loadedCategories]);

  const categories = useMemo(() => {
    return ['vibrant', 'luxury', 'dark', 'soft', 'warm', 'solid'];
  }, []);

  return {
    loadCategory,
    getGradientsByCategory,
    getSolidColors,
    getAllGradients,
    categories,
    loadedCategories: Array.from(loadedCategories),
    isLoading,
  };
};