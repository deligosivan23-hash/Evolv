export type GoalType = 'time' | 'rating';

export interface HabitLog {
  id: string;
  date: string;
  durationPerformed: number;
  rating?: number;
  reflection: string;
}

export interface HabitJournalEntry {
  id: string;
  date: string;
  text: string;
}

export interface Habit {
  id: string;
  title: string;
  days: number[];
  startTime: string;
  duration: number;
  logs: HabitLog[];
  showInChecklist: boolean;
  journal?: HabitJournalEntry[];
  archived?: boolean;
}

export interface StandaloneTask {
  id: string;
  title: string;
  completed: boolean;
  date: string;
}

export interface Hypothesis {
  id: string;
  description: string;
  habits: Habit[];
  testCount: number;
}

export interface Problem {
  id: string;
  description: string;
  hypotheses: Hypothesis[];
}

export interface Goal {
  id: string;
  title: string;
  type: GoalType;
  deadline: string;
  targetValue: number;
  targetUnit: string;
  progress: number;
  color: string;
  problems: Problem[];
  createdAt: string;
}

export type AppScreen = 'dashboard' | 'goals' | 'goal-detail' | 'problem-detail' | 'hypothesis-detail' | 'analytics' | 'settings';
