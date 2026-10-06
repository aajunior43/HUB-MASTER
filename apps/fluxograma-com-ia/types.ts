export interface DiagramData {
  id: string;
  title: string;
  mermaidCode: string;
  explanation: string;
  createdAt: number;
}

export interface DiagramResponse {
  title: string;
  mermaidCode: string;
  explanation: string;
}

export enum ViewMode {
  PREVIEW = 'PREVIEW',
  CODE = 'CODE'
}

export enum DiagramType {
  FLOWCHART = 'Flowchart',
  SEQUENCE = 'Sequence',
  CLASS = 'Class',
  STATE = 'State',
  ER = 'Entity Relationship',
  GANTT = 'Gantt',
  MINDMAP = 'Mindmap'
}