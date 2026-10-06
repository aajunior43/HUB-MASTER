export type Tone = 'Sarcástico' | 'Motivacional' | 'Minimalista' | 'Romântico' | 'Caótico' | 'Sad' | 'Filosófico' | 'Agressivo' | 'Irônico' | 'Niilista' | 'Poético' | 'Inspirador' | 'Cínico';

export type FontStyle = 'font-sans' | 'font-mono' | 'font-display' | 'font-serif';

export type Alignment = 'text-left' | 'text-center' | 'text-right';

export interface Palette {
  name: string;
  bg: string;
  text: string;
  border: string;
}

export interface CardConfig {
  text: string;
  font: FontStyle;
  fontSize: number;
  alignment: Alignment;
  padding: number;
  palette: Palette;
  hasNoise: boolean;
  uppercase: boolean;
}

export interface GeneratedVariant {
  id: string;
  tone: string; // AI determines this now
  text: string;
  font: FontStyle;
  paletteName: string;
  alignment: Alignment;
  fontSize: number;
  hasNoise: boolean;
  uppercase: boolean;
}