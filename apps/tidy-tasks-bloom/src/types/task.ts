export interface Task {
  id: string;
  title: string;
  completed: boolean;
  category: 'trabalho' | 'pessoal' | 'compras';
}