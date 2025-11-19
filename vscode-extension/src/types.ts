export interface Rule {
  id: number;
  rule: string;
}

export interface Rules {
  always?: Rule[];
  never?: Rule[];
  prefer?: Rule[];
  context?: Rule[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  relatedFiles?: string[];
  assignee?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Board {
  title: string;
  rules?: Rules;
  columns: Column[];
  archive?: Task[];
}
