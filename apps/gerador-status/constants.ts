import { Palette, Tone, FontStyle } from './types';

export const TONES: Tone[] = ['Motivacional', 'Sarcástico', 'Minimalista', 'Romântico', 'Caótico', 'Sad', 'Filosófico', 'Agressivo', 'Irônico', 'Niilista', 'Poético', 'Inspirador', 'Cínico'];

export const PALETTES: Palette[] = [
  { name: 'P&B', bg: '#ffffff', text: '#000000', border: '#000000' },
  { name: 'DARK', bg: '#000000', text: '#ffffff', border: '#ffffff' },
  { name: 'ACID', bg: '#ccff00', text: '#000000', border: '#000000' },
  { name: 'BLUE', bg: '#0000ff', text: '#ffffff', border: '#000000' },
  { name: 'WARNING', bg: '#ffff00', text: '#000000', border: '#000000' },
  { name: 'ERROR', bg: '#ff0000', text: '#000000', border: '#ffffff' },
  { name: 'MATRIX', bg: '#000000', text: '#00ff00', border: '#00ff00' },
  { name: 'VAPOR', bg: '#ff71ce', text: '#05ffa1', border: '#b967ff' },
  { name: 'BLOOD', bg: '#8a0303', text: '#ffffff', border: '#ff0000' },
  { name: 'CEMENT', bg: '#a9a9a9', text: '#000000', border: '#000000' },
  { name: 'CYBER', bg: '#000022', text: '#fcee0a', border: '#00ffff' },
  { name: 'LAVENDER', bg: '#e6e6fa', text: '#4b0082', border: '#4b0082' },
  { name: 'TOXIC', bg: '#39ff14', text: '#000000', border: '#000000' }
];

export const FONTS = [
  { label: 'GROTESK', value: 'font-sans' },
  { label: 'MONO', value: 'font-mono' },
  { label: 'HEAVY', value: 'font-display' },
  { label: 'SERIF', value: 'font-serif' },
];

export const getPaletteByName = (name: string): Palette => {
  const normalized = name.toUpperCase();
  return PALETTES.find(p => p.name === normalized) || PALETTES[2]; // Default to ACID
};

export const INITIAL_CONFIG = {
  text: 'DIGITE UM TEMA\nOU GERE COM IA',
  font: 'font-display' as FontStyle,
  fontSize: 60,
  alignment: 'text-left' as const,
  padding: 8,
  palette: PALETTES[2], 
  hasNoise: true,
  uppercase: true,
};