
export type Mode = 'create' | 'improve' | 'evolution';
export type Strategy = 'iterations' | 'score';
export type MutationIntensity = 'low' | 'medium' | 'high';
export type PromptFramework = 
  | 'auto' 
  | 'costar' 
  | 'cot' 
  | 'few-shot' 
  | 'persona' 
  | 'decomposition' 
  | 'race' 
  | 'ape' 
  | 'rise' 
  | 'tag' 
  | 'bab';

export interface PromptVersion {
  step: number;
  content: string;
  score: number;
  critique: string;
  changes: string;
  usedTechnique?: string;
  techniqueExplanation?: string;
  techniqueApplication?: string;
}

export interface OptimizationConfig {
  mode: Mode;
  // Common
  selectedTechnique: PromptFramework;
  
  // For 'improve'
  strategy: Strategy;
  targetIterations: number;
  targetScore: number;

  // For 'create'
  creativityLevel: number; // 0 to 100

  // For 'evolution'
  mutationIntensity: MutationIntensity;
  evolutionGenerations: number;
}

export interface PromptResponseSchema {
  score: number;
  critique: string;
  changes: string;
  improvedPrompt: string;
  usedTechnique: string;
  techniqueExplanation: string;
  techniqueApplication: string;
}
