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

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  relatedFiles?: string[];
  assignee?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  subtasks?: Subtask[];
  template?: 'bug' | 'feature' | 'refactor';
}

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

export interface AgentInstructions {
  instructions: string[];
}

export interface Board {
  title: string;
  agent?: AgentInstructions;
  rules?: Rules;
  columns: Column[];
  archive?: Task[];
}
