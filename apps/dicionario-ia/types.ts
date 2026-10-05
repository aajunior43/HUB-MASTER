export interface DictionaryEntry {
  word: string;
  definition: string;
  context?: string;
}

export interface VocabularyData {
  vocabulary: DictionaryEntry[];
  relatedThemes: string[];
}

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  data: VocabularyData | null;
  searchedTheme: string;
}
