import { AnalysisResult } from './AnalysisResult';

export enum AnalysisDecision {
  DEFERIDO = 'DEFERIDO',
  INDEFERIDO = 'INDEFERIDO',
}

export interface AnalysisResult {
  status: AnalysisDecision;
  summary: string;
  issues: string[];
}

export interface HistoryItem {
  fileName: string;
  timestamp: string;
  result: AnalysisResult;
}
