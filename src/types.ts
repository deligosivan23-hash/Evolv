export type GoalType = 'time' | 'rating';

export interface HabitLog {
  id: string;
  date: string; // ISO string
  durationPerformed: number; // minutes
  rating?: number; // 1-10
  reflection: string;
}

export interface HabitJournalEntry {
  id: string;
  date: string; // ISO string
  text: string;
}

export interface Habit {
  id: string;
  title: string;
  days: number[]; // 0-6 (Sun-Sat)
  startTime: string; // HH:mm
  duration: number; // minutes
  logs: HabitLog[];
  showInChecklist: boolean;
  journal?: HabitJournalEntry[]; // #8: running notes log
}

export interface StandaloneTask {
  id: string;
  title: string;
  completed: boolean;
  date: string; // ISO date
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
  deadline: string; // ISO string
  targetValue: number;
  targetUnit: string;
  progress: number;
  color: string; // Gradient or hex
  problems: Problem[];
  createdAt: string;
}

export type AppScreen = 'dashboard' | 'goals' | 'goal-detail' | 'problem-detail' | 'hypothesis-detail' | 'analytics';
