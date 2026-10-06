
export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
  category: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  content: string;
  version: number;
  created_at: string;
}

export type CreatePromptData = Omit<Prompt, 'id' | 'created_at' | 'updated_at' | 'version'>;
export type UpdatePromptData = Partial<CreatePromptData>;
