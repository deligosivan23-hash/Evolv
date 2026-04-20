import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Target, AlertCircle, Lightbulb, Calendar, LayoutDashboard, BarChart3,
  ChevronRight, ArrowLeft, Timer, CheckCircle2, Check, Trash2, Clock, X,
  Play, Square, History, Download, BookOpen, AlertTriangle, Info, RefreshCw,
  Flame, Settings, Share2, Archive, ArchiveRestore, Pencil, Shield
} from 'lucide-react';
import {
  format, parseISO, isSameDay, addDays, subDays, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfYear, endOfYear, eachDayOfInterval,
  eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, isSameMonth,
  isSameYear, isSameWeek, differenceInDays, isBefore
} from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Goal, Problem, Hypothesis, Habit, HabitLog, HabitJournalEntry, AppScreen, GoalType, StandaloneTask } from './types';
import { useNotifications } from './useNotifications';

// ─── Utilities ───────────────────────────────
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// ─── Brand Color ─────────────────────────────
const BRAND = '#7A5230';

// ─── Plan Limits (Free Tier) ─────────────────
const FREE_LIMITS = { goals: 3, habitsPerHypothesis: 5 };

// ─── Habit Templates ─────────────────────────
const HABIT_TEMPLATES = [
  {
    label: 'Morning Routine',
    icon: '🌅',
    habits: [
      { title: 'Wake-up Stretch', days: [1,2,3,4,5,6,0], startTime: '06:00', duration: 10, showInChecklist: false },
      { title: 'Cold Shower', days: [1,2,3,4,5,6,0], startTime: '06:15', duration: 5, showInChecklist: true },
      { title: 'Journaling', days: [1,2,3,4,5,6,0], startTime: '06:30', duration: 15, showInChecklist: false },
    ]
  },
  {
    label: 'Deep Work',
    icon: '🧠',
    habits: [
      { title: 'Focus Session', days: [1,2,3,4,5], startTime: '09:00', duration: 90, showInChecklist: false },
      { title: 'Review & Plan Next', days: [1,2,3,4,5], startTime: '10:45', duration: 15, showInChecklist: true },
    ]
  },
  {
    label: 'Fitness',
    icon: '💪',
    habits: [
      { title: 'Workout', days: [1,3,5], startTime: '07:00', duration: 45, showInChecklist: false },
      { title: 'Walk / Light Cardio', days: [2,4,6], startTime: '07:00', duration: 30, showInChecklist: false },
    ]
  },
  {
    label: 'Study Session',
    icon: '📚',
    habits: [
      { title: 'Read / Study', days: [1,2,3,4,5,6,0], startTime: '20:00', duration: 60, showInChecklist: false },
      { title: 'Flashcard Review', days: [1,2,3,4,5,6,0], startTime: '21:05', duration: 20, showInChecklist: true },
    ]
  },
  {
    label: 'Meditation',
    icon: '🧘',
    habits: [
      { title: 'Morning Meditation', days: [1,2,3,4,5,6,0], startTime: '07:00', duration: 15, showInChecklist: true },
    ]
  },
  {
    label: 'Evening Wind-Down',
    icon: '🌙',
    habits: [
      { title: 'No Screens', days: [1,2,3,4,5,6,0], startTime: '21:30', duration: 30, showInChecklist: true },
      { title: 'Reading', days: [1,2,3,4,5,6,0], startTime: '22:00', duration: 20, showInChecklist: false },
    ]
  },
];

// ─── Version & Changelog ─────────────────────
const APP_VERSION = '1.2.0';
const CHANGELOG = [
  {
    version: '1.2.0', date: 'Latest',
    changes: [
      'Brand color refresh — warm brown (#7A5230) across all CTAs',
      'Full dark mode — all screens, modals, and inputs properly themed',
      'Settings screen — dark mode, notifications, export, version, data reset',
      'Goal & habit deletion — remove goals, problems, hypotheses, and habits',
      'Habit editing — update name, schedule, and duration after creation',
      'Habit archiving — hide habits without losing history',
      'Goal progress manual override — adjust rating-type goal progress',
      'Quote sharing — share today\'s quote to social or copy to clipboard',
      'Improved date picker styling',
    ],
  },
  {
    version: '1.1.0', date: 'Previous',
    changes: [
      'Per-habit streak counters', 'Daily rotating motivational quotes (30+)',
      'GitHub-style heatmap calendar', '3-step onboarding flow',
      'Confetti on full daily completion', 'Weekly summary card',
      'Goal deadline warnings', 'Habit journal / notes',
      'Improved empty states', 'Haptic feedback', 'Pull-to-refresh',
    ],
  },
  {
    version: '1.0.0', date: 'Launch',
    changes: [
      'Goal → Problem → Hypothesis → Habit framework',
      'Timed habit sessions', 'Daily checklist', 'Analytics (day/week/month/year)',
      'CSV export', 'Dark mode', 'PWA + offline support',
    ],
  },
];

// ─── Quotes ──────────────────────────────────
const QUOTES = [
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
  { text: 'Small daily improvements are the key to staggering long-term results.', author: 'Robin Sharma' },
  { text: "You don't rise to the level of your goals. You fall to the level of your systems.", author: 'James Clear' },
  { text: 'Motivation is what gets you started. Habit is what keeps you going.', author: 'Jim Ryun' },
  { text: 'The chains of habit are too light to be felt until they are too heavy to be broken.', author: 'Warren Buffett' },
  { text: 'First forget inspiration. Habit is more dependable.', author: 'Octavia Butler' },
  { text: 'A year from now you may wish you had started today.', author: 'Karen Lamb' },
  { text: 'Success is the sum of small efforts, repeated day in and day out.', author: 'Robert Collier' },
  { text: "Don't watch the clock; do what it does. Keep going.", author: 'Sam Levenson' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
  { text: 'Your future is created by what you do today, not tomorrow.', author: 'Robert Kiyosaki' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Act as if what you do makes a difference. It does.', author: 'William James' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'Either you run the day, or the day runs you.', author: 'Jim Rohn' },
  { text: 'Excellence is not a destination; it is a continuous journey that never ends.', author: 'Brian Tracy' },
  { text: 'To improve is to change; to be perfect is to change often.', author: 'Winston Churchill' },
  { text: 'The mind is everything. What you think, you become.', author: 'Buddha' },
  { text: 'Energy and persistence conquer all things.', author: 'Benjamin Franklin' },
  { text: "Do one thing every day that scares you.", author: 'Eleanor Roosevelt' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: "What you get by achieving your goals is not as important as what you become.", author: 'Zig Ziglar' },
  { text: 'You are never too old to set another goal or to dream a new dream.', author: 'C.S. Lewis' },
  { text: 'Believe you can and you are halfway there.', author: 'Theodore Roosevelt' },
  { text: 'Change your thoughts and you change your world.', author: 'Norman Vincent Peale' },
  { text: 'Do what you can, with what you have, where you are.', author: 'Theodore Roosevelt' },
  { text: "I am not a product of my circumstances. I am a product of my decisions.", author: 'Stephen Covey' },
  { text: 'The only person you are destined to become is the person you decide to be.', author: 'Ralph Waldo Emerson' },
  { text: 'In the middle of every difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'It always seems impossible until it\'s done.', author: 'Nelson Mandela' },
  { text: 'The secret of change is to focus all your energy on building the new.', author: 'Socrates' },
];

function getDailyQuote() {
  return QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];
}

// ─── Per-Habit Streak ─────────────────────────
function getHabitStreak(habit: Habit): number {
  if (!habit.logs.length) return 0;
  let streak = 0;
  let checkDate = new Date();
  for (let i = 0; i < 365; i++) {
    const dow = checkDate.getDay();
    if (habit.days.includes(dow)) {
      if (!habit.logs.some(l => isSameDay(parseISO(l.date), checkDate))) break;
      streak++;
    }
    checkDate = subDays(checkDate, 1);
  }
  return streak;
}

// ─── Storage ──────────────────────────────────
const STORAGE_KEY = 'evolv_data';

// ─── Pull-to-Refresh Hook ─────────────────────
function usePullToRefresh(onRefresh: () => void) {
  const startY = useRef(0);
  const [pulling, setPulling] = useState(false);
  const [pullDelta, setPullDelta] = useState(0);
  const onTouchStart = useCallback((e: TouchEvent) => { startY.current = e.touches[0].clientY; }, []);
  const onTouchMove = useCallback((e: TouchEvent) => {
    const diff = e.touches[0].clientY - startY.current;
    if (window.scrollY === 0 && diff > 0) { setPulling(true); setPullDelta(Math.min(diff, 100)); }
  }, []);
  const onTouchEnd = useCallback(() => {
    if (pullDelta >= 80) onRefresh();
    setPulling(false); setPullDelta(0);
  }, [pullDelta, onRefresh]);
  useEffect(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);
  return { pulling, pullDelta };
}

// ─────────────────────────────────────────────
// App Root
// ─────────────────────────────────────────────
export default function App() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [standaloneTasks, setStandaloneTasks] = useState<StandaloneTask[]>([]);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  // Per-habit independent timers — each habit has its own state
  // startTimestamp: when the timer was last started (for background-resilient timing)
  // dailyTarget: user's custom daily override in minutes (null = use computed default)
  // targetHit: true once we've auto-recorded the target milestone
  const [timers, setTimers] = useState<Record<string, {
    seconds: number;
    running: boolean;
    paused: boolean;
    startTimestamp: number | null;
    dailyTarget: number | null;
    targetHit: boolean;
  }>>({});
  // Which habit's reflection modal is currently open + its form state
  const [reflectionHabitId, setReflectionHabitId] = useState<string | null>(null);
  const [reflectionText, setReflectionText] = useState('');
  const [rating, setRating] = useState<number>(5);
  // Separate state for checklist completion — never interferes with the running timer
  const [checklistHabitId, setChecklistHabitId] = useState<string | null>(null);
  const [checklistText, setChecklistText] = useState('');
  const [checklistRating, setChecklistRating] = useState<number>(5);
  const [showChecklistReflection, setShowChecklistReflection] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => localStorage.getItem('evolv_dark') === 'true');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !localStorage.getItem('evolv_onboarded'));
  const [showConfetti, setShowConfetti] = useState(false);
  // Streak freeze — once per week. weekKey = ISO week string
  const [streakFreeze, setStreakFreeze] = useState<{ usedWeek: string | null }>(() => {
    try { return JSON.parse(localStorage.getItem('evolv_freeze') || 'null') || { usedWeek: null }; } catch { return { usedWeek: null }; }
  });
  // Upgrade prompt modal
  const [showUpgrade, setShowUpgrade] = useState<{ reason: string } | null>(null);
  // Account — email saved locally (cloud sync coming when Supabase is added)
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('evolv_email') || '');
  const [showAccountModal, setShowAccountModal] = useState(false);

  useEffect(() => { localStorage.setItem('evolv_dark', String(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem('evolv_email', userEmail); }, [userEmail]);
  useEffect(() => { localStorage.setItem('evolv_freeze', JSON.stringify(streakFreeze)); }, [streakFreeze]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const p = JSON.parse(saved);
        const rawGoals: Goal[] = Array.isArray(p) ? p : (p.goals || []);
        // Recalculate progress for time goals so any old bad values are fixed on load
        const fixedGoals = rawGoals.map((g: Goal) => {
          if (g.type !== 'time') return g;
          let totalMinutes = 0;
          g.problems.forEach((prob: any) => prob.hypotheses.forEach((h: any) => h.habits.forEach((hab: any) => hab.logs.forEach((l: any) => { totalMinutes += l.durationPerformed; }))));
          const progress = Math.min(Math.round((totalMinutes / 60 / g.targetValue) * 100), 100);
          return { ...g, progress };
        });
        setGoals(fixedGoals);
        // CRUD Fix #3: prune standalone tasks older than 30 days to stop accumulation
        const thirtyDaysAgo = subDays(new Date(), 30);
        const rawTasks = Array.isArray(p) ? [] : (p.standaloneTasks || []);
        setStandaloneTasks(rawTasks.filter((t: StandaloneTask) => !isBefore(parseISO(t.date), thirtyDaysAgo)));
      } catch {}
    }
    // Restore any running timers that were active when app was closed
    const savedTimers = localStorage.getItem('evolv_timers');
    if (savedTimers) {
      try {
        const parsed = JSON.parse(savedTimers);
        // Recalculate seconds for any timer that was running
        const restored: typeof parsed = {};
        for (const id in parsed) {
          const t = parsed[id];
          if (t.running && t.startTimestamp) {
            const elapsed = Math.floor((Date.now() - t.startTimestamp) / 1000);
            restored[id] = { ...t, seconds: elapsed };
          } else {
            restored[id] = t;
          }
        }
        setTimers(restored);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ goals, standaloneTasks }));
  }, [goals, standaloneTasks]);

  // Persist timers to localStorage so they survive app close/reopen
  useEffect(() => {
    if (Object.keys(timers).length > 0) {
      localStorage.setItem('evolv_timers', JSON.stringify(timers));
    } else {
      localStorage.removeItem('evolv_timers');
    }
  }, [timers]);

  // Background-resilient timer tick
  // Instead of counting seconds, we calculate elapsed time from startTimestamp.
  // This means if the user backgrounds the app or removes it from Recent,
  // when they reopen it the timer correctly shows the real elapsed time.
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => {
        const hasRunning = Object.values(prev).some(t => t.running && !t.paused && t.startTimestamp !== null);
        if (!hasRunning) return prev;
        const next: typeof prev = {};
        for (const id in prev) {
          const t = prev[id];
          if (t.running && !t.paused && t.startTimestamp !== null) {
            // Calculate actual elapsed seconds from startTimestamp
            const elapsed = Math.floor((Date.now() - t.startTimestamp) / 1000);
            next[id] = { ...t, seconds: elapsed };
          } else {
            next[id] = t;
          }
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const navigateTo = (screen: AppScreen, goalId?: string, problemId?: string, hypothesisId?: string) => {
    setCurrentScreen(screen);
    if (goalId !== undefined) setSelectedGoalId(goalId);
    if (problemId !== undefined) setSelectedProblemId(problemId);
    if (hypothesisId !== undefined) setSelectedHypothesisId(hypothesisId);
  };

  const goBack = () => {
    if (currentScreen === 'goal-detail') navigateTo('goals');
    else if (currentScreen === 'problem-detail') navigateTo('goal-detail', selectedGoalId!);
    else if (currentScreen === 'hypothesis-detail') navigateTo('problem-detail', selectedGoalId!, selectedProblemId!);
    else navigateTo('dashboard');
  };

  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const selectedProblem = selectedGoal?.problems.find(p => p.id === selectedProblemId);
  const selectedHypothesis = selectedProblem?.hypotheses.find(h => h.id === selectedHypothesisId);

  // ── CRUD ─────────────────────────────────────
  // Free tier: max 3 goals
  const addGoal = (newGoal: Omit<Goal, 'id' | 'problems' | 'createdAt' | 'progress'>) => {
    if (goals.length >= FREE_LIMITS.goals) {
      setShowUpgrade({ reason: `Free plan is limited to ${FREE_LIMITS.goals} goals.` });
      return;
    }
    setGoals([...goals, { ...newGoal, id: crypto.randomUUID(), problems: [], createdAt: new Date().toISOString(), progress: 0 }]);
    setIsAddingGoal(false);
  };

  const deleteGoal = (goalId: string) => {
    setGoals(goals.filter(g => g.id !== goalId));
    navigateTo('goals');
  };

  // CRUD Fix #1: Edit goals, problems, hypotheses inline
  const updateGoalTitle = (goalId: string, title: string) =>
    setGoals(goals.map(g => g.id !== goalId ? g : { ...g, title }));

  const updateProblemDesc = (goalId: string, problemId: string, description: string) =>
    setGoals(goals.map(g => g.id !== goalId ? g : {
      ...g, problems: g.problems.map(p => p.id !== problemId ? p : { ...p, description })
    }));

  const updateHypothesisDesc = (goalId: string, problemId: string, hypothesisId: string, description: string) =>
    setGoals(goals.map(g => g.id !== goalId ? g : {
      ...g, problems: g.problems.map(p => p.id !== problemId ? p : {
        ...p, hypotheses: p.hypotheses.map(h => h.id !== hypothesisId ? h : { ...h, description })
      })
    }));

  // CRUD Fix #2: Delete a single habit log entry
  const deleteHabitLog = (habitId: string, logId: string) =>
    setGoals(goals.map(g => ({
      ...g, problems: g.problems.map(p => ({
        ...p, hypotheses: p.hypotheses.map(h => ({
          ...h, habits: h.habits.map(hab => hab.id !== habitId ? hab : {
            ...hab, logs: hab.logs.filter(l => l.id !== logId)
          })
        }))
      }))
    })));

  // CRUD Fix #4: Reorder habits within a hypothesis
  const moveHabit = (goalId: string, problemId: string, hypothesisId: string, habitId: string, direction: 'up' | 'down') =>
    setGoals(goals.map(g => g.id !== goalId ? g : {
      ...g, problems: g.problems.map(p => p.id !== problemId ? p : {
        ...p, hypotheses: p.hypotheses.map(h => {
          if (h.id !== hypothesisId) return h;
          const habits = [...h.habits];
          const idx = habits.findIndex(hab => hab.id === habitId);
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= habits.length) return h;
          [habits[idx], habits[swapIdx]] = [habits[swapIdx], habits[idx]];
          return { ...h, habits };
        })
      })
    }));

  const addProblem = (goalId: string, description: string) =>
    setGoals(goals.map(g => g.id !== goalId ? g : { ...g, problems: [...g.problems, { id: crypto.randomUUID(), description, hypotheses: [] }] }));

  const deleteProblem = (goalId: string, problemId: string) =>
    setGoals(goals.map(g => g.id !== goalId ? g : { ...g, problems: g.problems.filter(p => p.id !== problemId) }));

  const addHypothesis = (goalId: string, problemId: string, description: string) =>
    setGoals(goals.map(g => g.id !== goalId ? g : {
      ...g, problems: g.problems.map(p => p.id !== problemId ? p : {
        ...p, hypotheses: [...p.hypotheses, { id: crypto.randomUUID(), description, habits: [], testCount: 0 }]
      })
    }));

  const deleteHypothesis = (goalId: string, problemId: string, hypothesisId: string) =>
    setGoals(goals.map(g => g.id !== goalId ? g : {
      ...g, problems: g.problems.map(p => p.id !== problemId ? p : {
        ...p, hypotheses: p.hypotheses.filter(h => h.id !== hypothesisId)
      })
    }));

  // Free tier: max 5 habits per hypothesis
  const addHabit = (goalId: string, problemId: string, hypothesisId: string, habit: Omit<Habit, 'id' | 'logs'>) => {
    const hyp = goals.find(g => g.id === goalId)?.problems.find(p => p.id === problemId)?.hypotheses.find(h => h.id === hypothesisId);
    const activeCount = hyp?.habits.filter(h => !h.archived).length || 0;
    if (activeCount >= FREE_LIMITS.habitsPerHypothesis) {
      setShowUpgrade({ reason: `Free plan is limited to ${FREE_LIMITS.habitsPerHypothesis} habits per hypothesis.` });
      return;
    }
    setGoals(goals.map(g => g.id !== goalId ? g : {
      ...g, problems: g.problems.map(p => p.id !== problemId ? p : {
        ...p, hypotheses: p.hypotheses.map(h => h.id !== hypothesisId ? h : {
          ...h, habits: [...h.habits, { ...habit, id: crypto.randomUUID(), logs: [], journal: [] }]
        })
      })
    }));
  };

  const deleteHabit = (goalId: string, problemId: string, hypothesisId: string, habitId: string) =>
    setGoals(goals.map(g => g.id !== goalId ? g : {
      ...g, problems: g.problems.map(p => p.id !== problemId ? p : {
        ...p, hypotheses: p.hypotheses.map(h => h.id !== hypothesisId ? h : {
          ...h, habits: h.habits.filter(hab => hab.id !== habitId)
        })
      })
    }));

  const updateHabit = (goalId: string, problemId: string, hypothesisId: string, habitId: string, updates: Partial<Habit>) =>
    setGoals(goals.map(g => g.id !== goalId ? g : {
      ...g, problems: g.problems.map(p => p.id !== problemId ? p : {
        ...p, hypotheses: p.hypotheses.map(h => h.id !== hypothesisId ? h : {
          ...h, habits: h.habits.map(hab => hab.id !== habitId ? hab : { ...hab, ...updates })
        })
      })
    }));

  const archiveHabit = (goalId: string, problemId: string, hypothesisId: string, habitId: string) => {
    const habit = goals.find(g => g.id === goalId)?.problems.find(p => p.id === problemId)?.hypotheses.find(h => h.id === hypothesisId)?.habits.find(hab => hab.id === habitId);
    if (habit) updateHabit(goalId, problemId, hypothesisId, habitId, { archived: !habit.archived });
  };

  const setGoalProgress = (goalId: string, progress: number) =>
    setGoals(goals.map(g => g.id !== goalId ? g : { ...g, progress }));

  const addStandaloneTask = (title: string) =>
    setStandaloneTasks([...standaloneTasks, { id: crypto.randomUUID(), title, completed: false, date: new Date().toISOString() }]);

  const toggleStandaloneTask = (id: string) => {
    setStandaloneTasks(standaloneTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const deleteStandaloneTask = (id: string) => setStandaloneTasks(standaloneTasks.filter(t => t.id !== id));

  const logHabit = (habitId: string, durationMinutes: number, reflection: string, habitRating?: number) => {
    // Prune logs older than 1 year to prevent localStorage bloat (Hygiene #3)
    const oneYearAgo = subDays(new Date(), 365);
    setGoals(goals.map(g => {
      let updatedGoal = { ...g };
      updatedGoal.problems = g.problems.map(p => ({
        ...p, hypotheses: p.hypotheses.map(h => {
          const hasHabit = h.habits.some(hab => hab.id === habitId);
          return {
            ...h,
            // Bug Fix #4: increment testCount when a habit in this hypothesis is logged
            testCount: hasHabit ? h.testCount + 1 : h.testCount,
            habits: h.habits.map(hab => {
              if (hab.id !== habitId) return hab;
              // Prune old logs + append the new one
              const prunedLogs = hab.logs.filter(l => !isBefore(parseISO(l.date), oneYearAgo));
              return { ...hab, logs: [...prunedLogs, { id: crypto.randomUUID(), date: new Date().toISOString(), durationPerformed: durationMinutes, reflection, rating: habitRating }] };
            })
          };
        })
      }));

      // Recalculate progress correctly based on goal type
      if (updatedGoal.type === 'time') {
        // Sum all logged minutes across all habits in this goal, convert to goal unit (hours)
        let totalMinutes = 0;
        updatedGoal.problems.forEach(p => p.hypotheses.forEach(h => h.habits.forEach(hab => hab.logs.forEach(l => { totalMinutes += l.durationPerformed; }))));
        const totalHours = totalMinutes / 60;
        updatedGoal.progress = Math.min(Math.round((totalHours / updatedGoal.targetValue) * 100), 100);
      }
      // For rating goals: progress is set manually via the slider — don't touch it here

      return updatedGoal;
    }));
  };

  const addJournalNote = (goalId: string, problemId: string, hypothesisId: string, habitId: string, text: string) =>
    setGoals(goals.map(g => g.id !== goalId ? g : {
      ...g, problems: g.problems.map(p => p.id !== problemId ? p : {
        ...p, hypotheses: p.hypotheses.map(h => h.id !== hypothesisId ? h : {
          ...h, habits: h.habits.map(hab => hab.id !== habitId ? hab : {
            ...hab, journal: [...(hab.journal || []), { id: crypto.randomUUID(), date: new Date().toISOString(), text }]
          })
        })
      })
    }));

  // ── Computed ──────────────────────────────────
  const todayHabits = useMemo(() => {
    const today = new Date().getDay();
    const result: { habit: Habit; goal: Goal; hypothesis: Hypothesis }[] = [];
    goals.forEach(g => g.problems.forEach(p => p.hypotheses.forEach(h =>
      h.habits.forEach(hab => { if (hab.days.includes(today) && !hab.archived) result.push({ habit: hab, goal: g, hypothesis: h }); })
    )));
    return result;
  }, [goals]);

  const streak = useMemo(() => {
    // Collect all active (non-archived) habits
    const allHabits: Habit[] = [];
    goals.forEach(g => g.problems.forEach(p => p.hypotheses.forEach(h =>
      h.habits.filter(hab => !hab.archived).forEach(hab => allHabits.push(hab))
    )));
    if (!allHabits.length) return 0;

    let count = 0;
    let cd = new Date();
    for (let i = 0; i < 365; i++) {
      const dow = cd.getDay();
      const scheduledForDay = allHabits.filter(hab => hab.days.includes(dow));
      // If no habits were scheduled this day, skip it (don't break, don't count)
      if (scheduledForDay.length === 0) { cd = subDays(cd, 1); continue; }
      // Streak requires every scheduled habit for that day to be logged
      const allDone = scheduledForDay.every(hab =>
        hab.logs.some(l => isSameDay(parseISO(l.date), cd))
      );
      if (!allDone) break;
      count++;
      cd = subDays(cd, 1);
    }
    return count;
  }, [goals]);

  const allTodayDone = useMemo(() => todayHabits.length > 0 && todayHabits.every(({ habit }) => habit.logs.some(l => isSameDay(parseISO(l.date), new Date()))), [todayHabits]);
  const prevAllDoneRef = useRef(false);
  useEffect(() => {
    if (allTodayDone && !prevAllDoneRef.current) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4500); }
    prevAllDoneRef.current = allTodayDone;
  }, [allTodayDone]);

  const hasDeadlineWarning = useMemo(() => goals.some(g => { const d = differenceInDays(parseISO(g.deadline), new Date()); return d >= 0 && d <= 7 && g.progress < 70; }), [goals]);

  // ── Auto-record when timer hits the daily target ──────────────────────
  // When the running seconds reach or pass the daily target, we silently log
  // the hit and mark targetHit=true so we don't double-log. The timer keeps
  // running so the user sees total time spent.
  useEffect(() => {
    // Capture data needed for logging inside the setTimers callback so we always
    // read from `prev` (accurate) instead of the stale outer `timers` closure.
    const autoLogData: Array<{ id: string; targetMinutes: number }> = [];
    setTimers(prev => {
      const next = { ...prev };
      for (const id in prev) {
        const t = prev[id];
        if (!t.running || t.targetHit) continue;
        const habitInfo = todayHabits.find(h => h.habit.id === id);
        if (!habitInfo) continue;
        const { habit } = habitInfo;
        const dailyTargetSeconds = (t.dailyTarget !== null ? t.dailyTarget : habit.duration) * 60;
        if (t.seconds >= dailyTargetSeconds && dailyTargetSeconds > 0) {
          next[id] = { ...t, targetHit: true };
          // Capture targetMinutes from `t` (from `prev`) — never stale
          const targetMinutes = t.dailyTarget !== null ? t.dailyTarget : habit.duration;
          autoLogData.push({ id, targetMinutes });
        }
      }
      return next;
    });
    // Log each habit that just hit its target using the data captured above
    autoLogData.forEach(({ id, targetMinutes }) => {
      logHabit(id, targetMinutes, '[Auto-recorded: target reached — timer still running]', undefined);
      if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
    });
  }, [timers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Streak freeze helpers
  const currentWeekKey = format(new Date(), 'yyyy-ww');
  const freezeAvailableThisWeek = streakFreeze.usedWeek !== currentWeekKey;
  // Show the freeze button when streak > 0 but today has no logs yet
  const todayHasAnyLog = todayHabits.some(({ habit }) => habit.logs.some(l => isSameDay(parseISO(l.date), new Date())));
  const showFreezeButton = streak > 0 && !todayHasAnyLog && freezeAvailableThisWeek;
  const useStreakFreeze = () => {
    setStreakFreeze({ usedWeek: currentWeekKey });
    if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
  };

  useNotifications(todayHabits);

  // Per-habit timer controls
  const startTimer = (habitId: string, dailyTargetOverride?: number) => {
    setTimers(prev => {
      const existing = prev[habitId];
      const pausedSeconds = existing?.seconds || 0;
      // When resuming from pause, offset the startTimestamp so elapsed calc is correct
      const newStartTimestamp = Date.now() - pausedSeconds * 1000;
      return {
        ...prev,
        [habitId]: {
          seconds: pausedSeconds,
          running: true,
          paused: false,
          startTimestamp: newStartTimestamp,
          dailyTarget: dailyTargetOverride ?? existing?.dailyTarget ?? null,
          targetHit: existing?.targetHit || false,
        }
      };
    });
  };
  const togglePause = (habitId: string) => {
    setTimers(prev => {
      if (!prev[habitId]) return prev;
      const t = prev[habitId];
      if (!t.paused) {
        // Pausing: freeze current seconds, clear startTimestamp
        return { ...prev, [habitId]: { ...t, paused: true, running: false, startTimestamp: null } };
      } else {
        // Resuming: set new startTimestamp offset by already-elapsed seconds
        const newStartTimestamp = Date.now() - t.seconds * 1000;
        return { ...prev, [habitId]: { ...t, paused: false, running: true, startTimestamp: newStartTimestamp } };
      }
    });
  };
  const stopTimer = (habitId: string) => {
    setTimers(prev => {
      if (!prev[habitId]) return prev;
      const t = prev[habitId];
      // Recalculate final seconds from startTimestamp before stopping
      const finalSeconds = (t.running && t.startTimestamp !== null)
        ? Math.floor((Date.now() - t.startTimestamp) / 1000)
        : t.seconds;
      return { ...prev, [habitId]: { ...t, running: false, paused: false, startTimestamp: null, seconds: finalSeconds } };
    });
    setReflectionHabitId(habitId);
    if (navigator.vibrate) navigator.vibrate(50);
  };
  // Checklist completion — completely separate, never touches timers
  const completeChecklistHabit = (habitId: string) => { setChecklistHabitId(habitId); setShowChecklistReflection(true); if (navigator.vibrate) navigator.vibrate(50); };
  // Save reflection and clear that habit's timer
  const saveReflection = () => {
    if (reflectionHabitId) {
      const t = timers[reflectionHabitId];
      const seconds = t?.seconds || 0;
      const totalMinutes = Math.floor(seconds / 60);
      const info = todayHabits.find(h => h.habit.id === reflectionHabitId);
      const isRating = info?.goal.type === 'rating';
      const dailyTarget = t?.dailyTarget !== null ? t?.dailyTarget : info?.habit.duration;

      if (t?.targetHit) {
        // Target was already auto-recorded. Only log the EXCESS time if any.
        const excessMinutes = totalMinutes - (dailyTarget || 0);
        if (excessMinutes > 0) {
          // Log the excess as a separate entry so it reduces future requirements
          logHabit(reflectionHabitId, excessMinutes, `[Extra time: ${excessMinutes}m beyond target] ${reflectionText}`.trim(), isRating ? rating : undefined);
        } else if (reflectionText.trim()) {
          // No excess but user wrote a reflection — attach it to the auto-recorded entry
          logHabit(reflectionHabitId, 0, `[Reflection added] ${reflectionText}`.trim(), isRating ? rating : undefined);
        }
      } else {
        // Normal stop before target — log full duration
        logHabit(reflectionHabitId, isRating ? 0 : totalMinutes, reflectionText, isRating ? rating : undefined);
      }
      setTimers(prev => { const n = { ...prev }; delete n[reflectionHabitId!]; return n; });
    }
    setReflectionHabitId(null); setReflectionText(''); setRating(5);
  };
  // Checklist reflection save — never touches timer state
  const saveChecklistReflection = () => {
    if (checklistHabitId) {
      const info = todayHabits.find(h => h.habit.id === checklistHabitId);
      const isRating = info?.goal.type === 'rating';
      logHabit(checklistHabitId, 0, checklistText, isRating ? checklistRating : undefined);
    }
    setShowChecklistReflection(false); setChecklistText(''); setChecklistRating(5); setChecklistHabitId(null);
  };

  const exportData = () => {
    const rows = [['Goal', 'Type', 'Problem', 'Hypothesis', 'Habit', 'Date', 'Duration', 'Rating', 'Reflection']];
    goals.forEach(g => g.problems.forEach(p => p.hypotheses.forEach(h => h.habits.forEach(hab => hab.logs.forEach(log => {
      rows.push([g.title, g.type, p.description, h.description, hab.title, format(parseISO(log.date), 'yyyy-MM-dd HH:mm'), log.durationPerformed.toString(), log.rating?.toString() || '', log.reflection.replace(/"/g, '""')]);
    })))));
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'evolv_progress.csv';
    a.style.visibility = 'hidden'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const { pulling, pullDelta } = usePullToRefresh(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) { try { const p = JSON.parse(s); setGoals(p.goals || []); setStandaloneTasks(p.standaloneTasks || []); } catch {} }
  });

  const dm = darkMode;

  return (
    <div className={cn('min-h-screen font-sans selection:bg-[#E5E5E5] transition-colors duration-300', dm ? 'bg-[#111111] text-white' : 'bg-[#EBEBE9] text-[#1A1A1A]')}>
      <AnimatePresence>{showOnboarding && <OnboardingFlow onComplete={() => setShowOnboarding(false)} />}</AnimatePresence>
      <AnimatePresence>{showConfetti && <ConfettiEffect />}</AnimatePresence>

      {/* Pull indicator */}
      <AnimatePresence>
        {pulling && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={cn('fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-3 border-b backdrop-blur-sm', dm ? 'bg-[#1C1C1C]/80 border-[#2A2A2A]' : 'bg-white/80 border-gray-100')}>
            <RefreshCw size={16} className={cn('mr-2', dm ? 'text-gray-400' : 'text-gray-500', pullDelta >= 80 ? 'animate-spin' : '')} />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">{pullDelta >= 80 ? 'Release to refresh' : 'Pull to refresh'}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav — 4 items: Home, Goals, Stats, Settings */}
      <nav className={cn('fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:w-20 border-t md:border-t-0 md:border-r z-50 flex md:flex-col items-center justify-around md:justify-center gap-6 md:gap-10 py-3 md:py-8 transition-colors duration-300', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-100')}>
        <NavItem icon={<LayoutDashboard size={22} />} active={currentScreen === 'dashboard'} onClick={() => navigateTo('dashboard')} label="Home" dm={dm} />
        <NavItem icon={<Target size={22} />} active={currentScreen === 'goals' || currentScreen === 'goal-detail' || currentScreen === 'problem-detail' || currentScreen === 'hypothesis-detail'} onClick={() => navigateTo('goals')} label="Goals" dm={dm} badge={hasDeadlineWarning} />
        <NavItem icon={<BarChart3 size={22} />} active={currentScreen === 'analytics'} onClick={() => navigateTo('analytics')} label="Stats" dm={dm} />
        <NavItem icon={<Settings size={22} />} active={currentScreen === 'settings'} onClick={() => navigateTo('settings')} label="Settings" dm={dm} />
      </nav>

      <main className="pb-24 md:pb-8 md:pl-20 max-w-5xl mx-auto px-6 pt-8">
        <AnimatePresence mode="wait">
          {currentScreen === 'dashboard' && (
            <Dashboard todayHabits={todayHabits} standaloneTasks={standaloneTasks} onToggleTask={toggleStandaloneTask} onDeleteTask={deleteStandaloneTask} onAddTask={addStandaloneTask} onAddGoal={() => { navigateTo('goals'); setIsAddingGoal(true); }} timers={timers} startTimer={startTimer} togglePause={togglePause} stopTimer={stopTimer} onCompleteChecklist={completeChecklistHabit} streak={streak} dm={dm} goals={goals} showFreezeButton={showFreezeButton} freezeUsedThisWeek={!freezeAvailableThisWeek} onUseFreeze={useStreakFreeze} />
          )}
          {currentScreen === 'goals' && (
            <GoalsList goals={goals} onSelectGoal={(id: string) => navigateTo('goal-detail', id)} onAddGoal={() => setIsAddingGoal(true)} dm={dm} goalsAtLimit={goals.length >= FREE_LIMITS.goals} onUpgrade={() => setShowUpgrade({ reason: `Free plan is limited to ${FREE_LIMITS.goals} goals.` })} />
          )}
          {currentScreen === 'goal-detail' && selectedGoal && (
            <GoalDetail goal={selectedGoal} onBack={goBack} onAddProblem={(d: string) => addProblem(selectedGoal.id, d)} onSelectProblem={(pid: string) => navigateTo('problem-detail', selectedGoal.id, pid)} onDeleteProblem={(pid: string) => deleteProblem(selectedGoal.id, pid)} onDeleteGoal={() => deleteGoal(selectedGoal.id)} onSetProgress={(p: number) => setGoalProgress(selectedGoal.id, p)} onUpdateTitle={(title: string) => updateGoalTitle(selectedGoal.id, title)} onUpdateProblemDesc={(pid: string, d: string) => updateProblemDesc(selectedGoal.id, pid, d)} dm={dm} />
          )}
          {currentScreen === 'problem-detail' && selectedGoal && selectedProblem && (
            <ProblemDetail goal={selectedGoal} problem={selectedProblem} onBack={goBack} onAddHypothesis={(d: string) => addHypothesis(selectedGoal.id, selectedProblem.id, d)} onSelectHypothesis={(hid: string) => navigateTo('hypothesis-detail', selectedGoal.id, selectedProblem.id, hid)} onDeleteHypothesis={(hid: string) => deleteHypothesis(selectedGoal.id, selectedProblem.id, hid)} onUpdateHypothesisDesc={(hid: string, d: string) => updateHypothesisDesc(selectedGoal.id, selectedProblem.id, hid, d)} dm={dm} />
          )}
          {currentScreen === 'hypothesis-detail' && selectedGoal && selectedProblem && selectedHypothesis && (
            <HypothesisDetail goal={selectedGoal} problem={selectedProblem} hypothesis={selectedHypothesis} onBack={goBack} onAddHabit={(h: any) => addHabit(selectedGoal.id, selectedProblem.id, selectedHypothesis.id, h)} onDeleteHabit={(hid: string) => deleteHabit(selectedGoal.id, selectedProblem.id, selectedHypothesis.id, hid)} onUpdateHabit={(hid: string, updates: any) => updateHabit(selectedGoal.id, selectedProblem.id, selectedHypothesis.id, hid, updates)} onArchiveHabit={(hid: string) => archiveHabit(selectedGoal.id, selectedProblem.id, selectedHypothesis.id, hid)} onAddJournalNote={(hid: string, t: string) => addJournalNote(selectedGoal.id, selectedProblem.id, selectedHypothesis.id, hid, t)} onMoveHabit={(hid: string, dir: 'up' | 'down') => moveHabit(selectedGoal.id, selectedProblem.id, selectedHypothesis.id, hid, dir)} goalType={selectedGoal.type} dm={dm} />
          )}
          {currentScreen === 'analytics' && <Analytics goals={goals} onExport={exportData} onDeleteLog={deleteHabitLog} dm={dm} />}
          {currentScreen === 'settings' && <SettingsScreen dm={dm} onToggleDark={() => setDarkMode(!dm)} onExport={exportData} onClearData={() => { setGoals([]); setStandaloneTasks([]); localStorage.removeItem(STORAGE_KEY); }} userEmail={userEmail} onOpenAccount={() => setShowAccountModal(true)} onUpgrade={() => setShowUpgrade({ reason: 'Upgrade to unlock unlimited goals, habits, and more.' })} onReplayIntro={() => { localStorage.removeItem('evolv_onboarded'); setShowOnboarding(true); }} />}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isAddingGoal && <GoalFormModal onClose={() => setIsAddingGoal(false)} onSubmit={addGoal} dm={dm} />}
        {reflectionHabitId && <ReflectionModal text={reflectionText} setText={setReflectionText} rating={rating} setRating={setRating} isRatingType={todayHabits.find(h => h.habit.id === reflectionHabitId)?.goal.type === 'rating'} onSave={saveReflection} duration={timers[reflectionHabitId]?.seconds || 0} dm={dm} targetHit={timers[reflectionHabitId]?.targetHit || false} />}
        {showChecklistReflection && <ReflectionModal text={checklistText} setText={setChecklistText} rating={checklistRating} setRating={setChecklistRating} isRatingType={todayHabits.find(h => h.habit.id === checklistHabitId)?.goal.type === 'rating'} onSave={saveChecklistReflection} duration={0} dm={dm} />}
        {showUpgrade && <UpgradeModal reason={showUpgrade.reason} onClose={() => setShowUpgrade(null)} dm={dm} />}
        {showAccountModal && <AccountModal email={userEmail} onSave={(e: string) => { setUserEmail(e); setShowAccountModal(false); }} onClose={() => setShowAccountModal(false)} dm={dm} />}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────
// NavItem
// ─────────────────────────────────────────────
function NavItem({ icon, active, onClick, label, dm, badge }: { icon: React.ReactNode; active: boolean; onClick: () => void; label: string; dm?: boolean; badge?: boolean }) {
  return (
    <button onClick={onClick} className={cn('relative flex flex-col items-center gap-1 transition-all duration-300', active ? 'scale-110' : 'text-gray-400 hover:text-gray-500')} style={active ? { color: BRAND } : {}}>
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      {badge && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white" />}
    </button>
  );
}

// ─────────────────────────────────────────────
// Onboarding
// ─────────────────────────────────────────────
function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon: '🌱', title: 'Welcome to Evolv', desc: 'A personal progress planner built around the scientific method. Start with a goal, identify obstacles, test hypotheses, and build habits that actually work.' },
    { icon: '🧪', title: 'The Evolv Framework', desc: 'Goal → Problem → Hypothesis → Habit. Each habit you build is a test of a theory about achieving your goal. Track what works. Cut what doesn\'t.' },
    { icon: '🚀', title: 'You\'re Ready', desc: 'Start by creating your first goal. Be specific. Be ambitious. Every great evolution begins with one committed decision.' },
  ];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#FDFCFB] z-[300] flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-10 text-center">
        <div className="flex gap-1.5 justify-center">
          {steps.map((_, i) => <div key={i} style={i <= step ? { background: BRAND } : {}} className={cn('h-0.5 w-10 rounded-full transition-all duration-300', i > step && 'bg-gray-200')} />)}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="text-7xl">{steps[step].icon}</div>
            <h1 className="text-3xl font-light tracking-tight">{steps[step].title}</h1>
            <p className="text-gray-500 text-lg leading-relaxed max-w-sm mx-auto">{steps[step].desc}</p>
          </motion.div>
        </AnimatePresence>
        <div className="space-y-3">
          <button onClick={() => { if (step < steps.length - 1) setStep(step + 1); else { localStorage.setItem('evolv_onboarded', 'true'); onComplete(); } }} style={{ background: BRAND }} className="w-full text-white py-4 rounded-full font-medium hover:opacity-90 transition-opacity">
            {step < steps.length - 1 ? 'Continue' : 'Get Started →'}
          </button>
          {step < steps.length - 1 && <button onClick={() => { localStorage.setItem('evolv_onboarded', 'true'); onComplete(); }} className="text-gray-400 text-sm hover:text-gray-600 transition-colors">Skip intro</button>}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Confetti
// ─────────────────────────────────────────────
function ConfettiEffect() {
  const colors = [BRAND, '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#F97316'];
  const particles = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ id: i, color: colors[i % colors.length], x: Math.random() * 100, delay: Math.random() * 0.8, duration: 2.5 + Math.random() * 2, size: 6 + Math.random() * 8, isCircle: Math.random() > 0.5 })), []);
  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {particles.map(p => (
        <motion.div key={p.id} initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }} animate={{ y: '110vh', opacity: [1, 1, 0], rotate: 720 }} transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
          style={{ position: 'absolute', top: 0, width: p.size, height: p.size, borderRadius: p.isCircle ? '50%' : '2px', background: p.color }} />
      ))}
      <motion.div initial={{ opacity: 0, scale: 0.5, y: '45vh' }} animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.1, 1, 0.9] }} transition={{ duration: 2.5, times: [0, 0.2, 0.7, 1] }}
        className="absolute left-1/2 -translate-x-1/2 bg-white rounded-3xl px-8 py-5 shadow-2xl text-center space-y-1">
        <p className="text-2xl">🎉</p>
        <p className="font-medium text-[#1A1A1A]">All habits done!</p>
        <p className="text-xs text-gray-400 font-serif italic">Another day of evolution.</p>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Weekly Summary Card
// ─────────────────────────────────────────────
function WeeklySummaryCard({ goals, standaloneTasks, dm }: any) {
  const now = new Date();
  const pastDays = eachDayOfInterval({ start: startOfWeek(now), end: now });
  let totalCompleted = 0, totalPossible = 0, bestDay = '', bestCount = 0;
  pastDays.forEach(day => {
    let dc = 0, dp = 0;
    goals.forEach((g: Goal) => g.problems.forEach((p: Problem) => p.hypotheses.forEach((h: Hypothesis) => h.habits.forEach((hab: Habit) => {
      if (!hab.archived && hab.days.includes(day.getDay())) { dp++; if (hab.logs.some(l => isSameDay(parseISO(l.date), day))) dc++; }
    }))));
    const dt = standaloneTasks.filter((t: StandaloneTask) => isSameDay(parseISO(t.date), day));
    dp += dt.length; dc += dt.filter((t: StandaloneTask) => t.completed).length;
    totalCompleted += dc; totalPossible += dp;
    if (dc > bestCount) { bestCount = dc; bestDay = format(day, 'EEEE'); }
  });
  const rate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  return (
    <div className={cn('border rounded-2xl p-6 space-y-4', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-100')}>
      <h3 className="text-[10px] font-mono uppercase tracking-widest text-gray-400">This Week</h3>
      <div className="space-y-3">
        <div className="flex items-end gap-1.5">
          <span className="text-3xl font-light">{totalCompleted}</span>
          <span className={cn('text-sm mb-1', dm ? 'text-gray-500' : 'text-gray-400')}>/ {totalPossible} done</span>
        </div>
        <div className={cn('h-1.5 rounded-full overflow-hidden', dm ? 'bg-[#2A2A2A]' : 'bg-gray-100')}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: BRAND }} />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{rate}% completion</span>
          {bestDay && <span>Best: <span className={cn('font-medium', dm ? 'text-white' : 'text-[#1A1A1A]')}>{bestDay}</span></span>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────
function Dashboard({ todayHabits, standaloneTasks, onToggleTask, onDeleteTask, onAddTask, onAddGoal, timers, startTimer, togglePause, stopTimer, onCompleteChecklist, streak, dm, goals, showFreezeButton, freezeUsedThisWeek, onUseFreeze }: any) {
  const timedHabits = todayHabits.filter((h: any) => h.goal.type === 'time');
  const checklistHabits = todayHabits.filter((h: any) => h.habit.showInChecklist);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const todayStandalone = standaloneTasks.filter((t: any) => isSameDay(parseISO(t.date), new Date()));
  const quote = useMemo(() => getDailyQuote(), []);

  const shareQuote = async () => {
    const text = `"${quote.text}" — ${quote.author}`;
    if (navigator.share) { try { await navigator.share({ text }); return; } catch {} }
    try { await navigator.clipboard.writeText(text); alert('Quote copied to clipboard!'); } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-light tracking-tight">Daily Command</h1>
          <p className={cn('font-serif italic', dm ? 'text-gray-400' : 'text-gray-500')}>{format(new Date(), 'EEEE, MMMM do')}</p>
        </div>
        <button onClick={() => setIsAddingTask(true)} className={cn('flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium border transition-all', dm ? 'bg-[#1C1C1C] border-[#2A2A2A] text-white hover:border-white/30' : 'bg-white border-gray-200 text-[#1A1A1A] hover:border-[#7A5230]')}>
          <Plus size={16} /> Task
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-12">
          {/* Timed Habits */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">Timed Habits</h2>
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{timedHabits.length} Scheduled</span>
            </div>
            {timedHabits.length === 0 ? (
              <div className={cn('border border-dashed rounded-2xl p-10 text-center space-y-4', dm ? 'border-[#2A2A2A]' : 'border-gray-200 bg-white')}>
                <Timer className="mx-auto text-gray-300" size={40} />
                <p className={cn('font-medium', dm ? 'text-gray-300' : 'text-gray-600')}>No timed habits for today</p>
                <p className="text-sm text-gray-400">Set a goal and attach a timed habit to start tracking.</p>
                <button onClick={onAddGoal} style={{ color: BRAND }} className="text-sm font-medium underline underline-offset-4 hover:opacity-70 transition-opacity">Create your first goal →</button>
              </div>
            ) : (
              <div className="space-y-4">
                {timedHabits.map(({ habit, goal, hypothesis }: any) => {
                  const isLoggedToday = habit.logs.some((l: any) => isSameDay(parseISO(l.date), new Date()));
                  if (isLoggedToday) return null; // rendered in done section below
                  const daysRemaining = Math.max(1, Math.ceil((parseISO(goal.deadline).getTime() - Date.now()) / 86400000));
                  let totalActual = 0;
                  let todayActual = 0;
                  goal.problems.forEach((p: any) => p.hypotheses.forEach((h: any) => h.habits.forEach((hab: any) => hab.logs.forEach((l: any) => {
                    totalActual += l.durationPerformed;
                    if (isSameDay(parseISO(l.date), new Date())) todayActual += l.durationPerformed;
                  }))));
                  const rawAdjusted = Math.max(0, Math.round((goal.targetValue - totalActual) / daysRemaining));
                  const adjustedTarget = Math.max(0, rawAdjusted - todayActual);
                  const habitTimer = timers[habit.id] || { seconds: 0, running: false, paused: false };
                  const effectiveDailyTarget = habitTimer.dailyTarget !== null && habitTimer.dailyTarget !== undefined ? habitTimer.dailyTarget : (adjustedTarget || habit.duration);
                  return <HabitCard key={habit.id} habit={habit} goal={goal} isActive={habitTimer.running || habitTimer.seconds > 0} isTimerPaused={habitTimer.paused} timerSeconds={habitTimer.seconds} onStart={(override?: number) => startTimer(habit.id, override)} onPause={() => togglePause(habit.id)} onStop={() => stopTimer(habit.id)} mode="timer" adjustedTarget={adjustedTarget} dailyTarget={effectiveDailyTarget} targetHit={habitTimer.targetHit || false} dm={dm} />;
                })}
                {/* Done section — timed habits completed today */}
                {timedHabits.some(({ habit }: any) => habit.logs.some((l: any) => isSameDay(parseISO(l.date), new Date()))) && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 flex items-center gap-1.5"><CheckCircle2 size={11} /> Completed Today</p>
                    {timedHabits.filter(({ habit }: any) => habit.logs.some((l: any) => isSameDay(parseISO(l.date), new Date()))).map(({ habit, goal }: any) => (
                      <div key={habit.id} className={cn('flex items-center gap-4 p-4 rounded-2xl border', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-100')}>
                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                          <Check size={14} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn('font-medium text-sm', dm ? 'text-gray-300' : 'text-gray-500')}>{habit.title}</p>
                          <p className="text-[10px] font-mono uppercase tracking-wider text-gray-400">{goal.title}</p>
                        </div>
                        <span className="text-emerald-500 text-xs font-mono">✓ Done</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">Daily Checklist</h2>
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{checklistHabits.length + todayStandalone.length} Tasks</span>
            </div>
            {checklistHabits.length === 0 && todayStandalone.length === 0 ? (
              <div className={cn('border border-dashed rounded-2xl p-10 text-center space-y-4', dm ? 'border-[#2A2A2A]' : 'border-gray-200 bg-white')}>
                <CheckCircle2 className="mx-auto text-gray-300" size={40} />
                <p className={cn('font-medium', dm ? 'text-gray-300' : 'text-gray-600')}>Your checklist is empty</p>
                <button onClick={() => setIsAddingTask(true)} style={{ color: BRAND }} className="text-sm font-medium underline underline-offset-4 hover:opacity-70 transition-opacity">Add a task now →</button>
              </div>
            ) : (
              <div className={cn('border rounded-2xl overflow-hidden divide-y', dm ? 'bg-[#1C1C1C] border-[#2A2A2A] divide-[#2A2A2A]' : 'bg-white border-gray-100 divide-gray-50')}>
                {checklistHabits.map(({ habit, goal }: any) => {
                  const done = habit.logs.some((l: any) => isSameDay(parseISO(l.date), new Date()));
                  return (
                    <div key={habit.id} className={cn('flex items-center justify-between p-5 group transition-colors', dm ? 'hover:bg-[#252525]' : 'hover:bg-gray-50')}>
                      <div className="flex items-center gap-4">
                        <button onClick={() => !done && onCompleteChecklist(habit.id)} className={cn('w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all', done ? 'border-transparent' : dm ? 'border-[#3A3A3A] group-hover:border-[#7A5230]' : 'border-gray-200 group-hover:border-[#7A5230]')} style={done ? { background: BRAND, borderColor: BRAND } : {}}>
                          {done && <Check size={14} className="text-white" />}
                        </button>
                        <div className="space-y-0.5">
                          <p className={cn('font-medium', done && 'line-through text-gray-400')}>{habit.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: goal.color }} />
                            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">{goal.title}</span>
                          </div>
                        </div>
                      </div>
                      {!done && <button onClick={() => onCompleteChecklist(habit.id)} className="text-xs font-medium text-gray-400 hover:opacity-70 opacity-0 group-hover:opacity-100 transition-all" style={{ color: BRAND }}>Complete →</button>}
                    </div>
                  );
                })}
                {todayStandalone.map((task: any) => (
                  <div key={task.id} className={cn('flex items-center justify-between p-5 group transition-colors', dm ? 'hover:bg-[#252525]' : 'hover:bg-gray-50')}>
                    <div className="flex items-center gap-4">
                      <button onClick={() => onToggleTask(task.id)} className={cn('w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all', task.completed ? 'border-transparent' : dm ? 'border-[#3A3A3A] group-hover:border-[#7A5230]' : 'border-gray-200 group-hover:border-[#7A5230]')} style={task.completed ? { background: BRAND, borderColor: BRAND } : {}}>
                        {task.completed && <Check size={14} className="text-white" />}
                      </button>
                      <p className={cn('font-medium', task.completed && 'line-through text-gray-400')}>{task.title}</p>
                    </div>
                    <button onClick={() => onDeleteTask(task.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Stats */}
          <div className={cn('border rounded-2xl p-6 space-y-5', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-100')}>
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-light flex items-center gap-1">{streak}{streak >= 3 && <Flame size={16} style={{ color: BRAND }} />}</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Day Streak</p>
              </div>
            <div className="space-y-1">
                <p className="text-2xl font-light">
                  {(() => {
                    const timedDone = timedHabits.filter((h: any) => h.habit.logs.some((l: any) => isSameDay(parseISO(l.date), new Date()))).length;
                    const checkDone = checklistHabits.filter((h: any) => h.habit.logs.some((l: any) => isSameDay(parseISO(l.date), new Date()))).length;
                    const standDone = todayStandalone.filter((t: any) => t.completed).length;
                    const total = timedHabits.length + checklistHabits.length + todayStandalone.length;
                    return total > 0 ? Math.round(((timedDone + checkDone + standDone) / total) * 100) : 0;
                  })()}%
                </p>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Completion</p>
              </div>
            </div>
            {/* Streak Freeze */}
            {streak > 0 && (
              <div className={cn('rounded-xl p-3 flex items-center justify-between', dm ? 'bg-[#252525]' : 'bg-gray-50')}>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium flex items-center gap-1.5">🧊 Streak Freeze</p>
                  <p className="text-[10px] text-gray-400">
                    {freezeUsedThisWeek ? 'Used this week' : showFreezeButton ? 'Protect today\'s streak' : 'Streak safe today'}
                  </p>
                </div>
                {showFreezeButton ? (
                  <button onClick={onUseFreeze} style={{ background: BRAND }} className="text-white text-xs px-3 py-1.5 rounded-full font-medium hover:opacity-80 transition-opacity">
                    Freeze
                  </button>
                ) : (
                  <span className={cn('text-[10px] font-mono px-2 py-1 rounded-full', freezeUsedThisWeek ? 'bg-gray-200 text-gray-400' : 'text-emerald-600 bg-emerald-50')}>
                    {freezeUsedThisWeek ? 'Used' : '✓ Safe'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Weekly */}
          <WeeklySummaryCard goals={goals} standaloneTasks={standaloneTasks} dm={dm} />

          {/* Quote */}
          <div className="rounded-2xl p-6 space-y-4 relative group" style={{ background: BRAND }}>
            <p className="text-sm font-serif italic text-white/80 leading-relaxed">"{quote.text}"</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-white/50">— {quote.author}</p>
            {/* Share button */}
            <button onClick={shareQuote} className="absolute top-4 right-4 text-white/40 hover:text-white/90 transition-colors opacity-0 group-hover:opacity-100">
              <Share2 size={14} />
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {isAddingTask && <TaskFormModal onClose={() => setIsAddingTask(false)} onSubmit={(t: string) => { onAddTask(t); setIsAddingTask(false); }} dm={dm} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// HabitCard
// ─────────────────────────────────────────────
function HabitCard({ habit, goal, isActive, isTimerPaused, timerSeconds, onStart, onPause, onStop, onComplete, mode = 'timer', adjustedTarget, dailyTarget, targetHit, dm }: any) {
  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const isChecklist = mode === 'checklist';
  const habitStreak = useMemo(() => getHabitStreak(habit), [habit]);

  // Daily target control — user can override how many minutes to do today
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState<string>('');

  // The effective target for progress bar and display
  const effectiveTarget = dailyTarget || adjustedTarget || habit.duration;
  const progressPct = Math.min((timerSeconds / (effectiveTarget * 60)) * 100, 100);

  // Colors
  const isOverTarget = timerSeconds > effectiveTarget * 60;
  const progressColor = targetHit ? '#10B981' : BRAND; // green once hit

  const handleTargetEdit = () => {
    setTargetInput(String(effectiveTarget));
    setEditingTarget(true);
  };
  const handleTargetConfirm = () => {
    const val = parseInt(targetInput, 10);
    if (!isNaN(val) && val > 0) {
      onStart(val); // restart/update timer with new daily target
    }
    setEditingTarget(false);
  };

  return (
    <div className={cn('group relative border rounded-2xl p-5 transition-all duration-300', dm ? 'bg-[#1C1C1C]' : 'bg-white', isActive ? 'ring-2 shadow-xl scale-[1.01]' : (dm ? 'border-[#2A2A2A]' : 'border-gray-100 hover:border-gray-200'))} style={isActive ? { borderColor: targetHit ? '#10B981' : BRAND, '--tw-ring-color': targetHit ? '#10B981' : BRAND } as any : {}}>

      {/* Target-hit banner */}
      {targetHit && (
        <div className="absolute top-0 left-0 right-0 bg-emerald-500 text-white text-[10px] font-mono uppercase tracking-widest text-center py-1 rounded-t-2xl">
          ✓ Target hit — timer still running
        </div>
      )}

      <div className={cn('flex items-start justify-between gap-4', targetHit && 'mt-5')}>
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: goal.color }} />
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 truncate">{goal.title}</span>
            {habitStreak > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-white shrink-0" style={{ background: BRAND }}><Flame size={9} /> {habitStreak}</span>}
          </div>
          <h3 className="text-base font-medium">{habit.title}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
            {!isChecklist && <span className="flex items-center gap-1"><Clock size={11} /> {habit.startTime}</span>}
            {!isChecklist && (
              <div className="flex items-center gap-1">
                <Timer size={11} />
                {/* Tappable daily target — opens inline editor */}
                {editingTarget ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="number"
                      value={targetInput}
                      onChange={e => setTargetInput(e.target.value)}
                      onBlur={handleTargetConfirm}
                      onKeyDown={e => { if (e.key === 'Enter') handleTargetConfirm(); if (e.key === 'Escape') setEditingTarget(false); }}
                      className={cn('w-14 text-xs font-mono border rounded-lg px-2 py-0.5 focus:outline-none', dm ? 'bg-[#2A2A2A] border-[#3A3A3A] text-white' : 'bg-white border-gray-200')}
                    />
                    <span className="text-[10px]">min</span>
                  </div>
                ) : (
                  <button
                    onClick={handleTargetEdit}
                    title="Tap to set today's target"
                    className={cn('flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors', 
                      effectiveTarget !== habit.duration ? 'bg-amber-50 text-amber-700 border border-amber-100' : (dm ? 'hover:bg-[#2A2A2A]' : 'hover:bg-gray-100')
                    )}
                  >
                    {effectiveTarget !== habit.duration && <span className="line-through opacity-40 text-[10px]">{habit.duration}m</span>}
                    <span className={effectiveTarget !== habit.duration ? 'font-bold' : ''}>{effectiveTarget}m</span>
                    {!isActive && <Pencil size={9} className="ml-0.5 opacity-50" />}
                  </button>
                )}
              </div>
            )}
            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-mono uppercase', dm ? 'bg-[#2A2A2A]' : 'bg-gray-50')}>{goal.type}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {isChecklist ? (
            <button onClick={onComplete} style={{ borderColor: BRAND, color: BRAND }} className="px-5 py-2 border rounded-full text-sm font-medium hover:text-white hover:opacity-90 transition-all" onMouseEnter={e => (e.currentTarget.style.background = BRAND)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>Complete</button>
          ) : isActive ? (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={cn('text-xl font-mono tabular-nums', isOverTarget && 'text-emerald-500')}>{fmt(timerSeconds)}</div>
                {isOverTarget && <div className="text-[9px] text-emerald-500 font-mono">+{fmt(timerSeconds - effectiveTarget * 60)} over</div>}
              </div>
              <button onClick={onPause} className={cn('w-9 h-9 rounded-full flex items-center justify-center transition-colors', dm ? 'bg-[#2A2A2A] text-white hover:bg-[#3A3A3A]' : 'bg-gray-100 text-[#1A1A1A] hover:bg-gray-200')}>
                {isTimerPaused ? <Play size={14} fill="currentColor" /> : <div className="flex gap-0.5"><div className="w-1 h-3.5 bg-current rounded" /><div className="w-1 h-3.5 bg-current rounded" /></div>}
              </button>
              <button onClick={onStop} className="w-9 h-9 text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity" style={{ background: BRAND }}>
                <Square size={14} fill="currentColor" />
              </button>
            </div>
          ) : (
            <button onClick={() => onStart()} className={cn('w-9 h-9 border rounded-full flex items-center justify-center transition-all', dm ? 'border-[#3A3A3A] hover:border-[#7A5230]' : 'border-gray-200 hover:border-[#7A5230]')}>
              <Play size={14} className="ml-0.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar — fills to target, then shows overflow in green */}
      {!isChecklist && isActive && (
        <div className={cn('absolute bottom-0 left-0 right-0 h-1 rounded-b-2xl overflow-hidden', dm ? 'bg-[#2A2A2A]' : 'bg-gray-100')}>
          <motion.div
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5 }}
            className="absolute top-0 left-0 h-full rounded-b-2xl"
            style={{ background: progressColor }}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// GoalsList
// ─────────────────────────────────────────────
function GoalsList({ goals, onSelectGoal, onAddGoal, dm, goalsAtLimit, onUpgrade }: any) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-12">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-light tracking-tight">Your Goals</h1>
          <p className={cn('font-serif italic', dm ? 'text-gray-400' : 'text-gray-500')}>The foundation of your evolution.</p>
        </div>
        <button onClick={goalsAtLimit ? onUpgrade : onAddGoal} style={{ background: BRAND }} className="flex items-center gap-2 text-white px-6 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus size={16} /> New Goal
        </button>
      </header>

      {/* Free tier limit banner */}
      {goalsAtLimit && (
        <div className={cn('flex items-center justify-between px-5 py-4 rounded-2xl border', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-amber-50 border-amber-100')}>
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Free plan: {goals.length}/{FREE_LIMITS.goals} goals used</p>
            <p className="text-xs text-gray-400">Upgrade to Evolv Pro for unlimited goals.</p>
          </div>
          <button onClick={onUpgrade} style={{ color: BRAND }} className="text-xs font-medium underline underline-offset-2 hover:opacity-70 transition-opacity shrink-0 ml-4">Upgrade</button>
        </div>
      )}
      {goals.length === 0 ? (
        <div className={cn('border border-dashed rounded-2xl p-20 text-center space-y-6', dm ? 'border-[#2A2A2A]' : 'border-gray-200 bg-white')}>
          <Target className="mx-auto text-gray-200" size={64} />
          <div className="space-y-2">
            <h3 className="text-xl font-medium">No goals yet</h3>
            <p className="text-gray-400 max-w-xs mx-auto">Every evolution starts with a clear target. Define what you want to achieve — be specific, be bold.</p>
          </div>
          <button onClick={onAddGoal} style={{ background: BRAND }} className="inline-flex items-center gap-2 text-white px-8 py-3 rounded-full font-medium hover:opacity-90 transition-opacity">
            <Plus size={16} /> Set Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((goal: Goal) => {
            const daysLeft = differenceInDays(parseISO(goal.deadline), new Date());
            const isWarning = daysLeft >= 0 && daysLeft <= 7 && goal.progress < 70;
            return (
              <button key={goal.id} onClick={() => onSelectGoal(goal.id)} className={cn('group border rounded-2xl p-8 text-left hover:shadow-xl transition-all duration-300', dm ? 'bg-[#1C1C1C] border-[#2A2A2A] hover:border-[#7A5230]' : 'bg-white border-gray-100 hover:border-[#7A5230]', isWarning && 'border-amber-300')}>
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest', dm ? 'bg-[#2A2A2A] text-gray-400' : 'bg-gray-50 text-gray-500')}>
                        {goal.targetValue} {goal.targetUnit}
                      </span>
                      {isWarning && <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-mono"><AlertTriangle size={9} /> {daysLeft}d</span>}
                    </div>
                    <ChevronRight size={15} className="text-gray-300 group-hover:translate-x-1 transition-transform" style={{ color: 'inherit' }} />
                  </div>
                  <h3 className="text-xl font-light leading-tight">{goal.title}</h3>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-gray-400">
                      <span>Progress</span><span>{goal.progress}%</span>
                    </div>
                    <div className={cn('h-1 w-full rounded-full overflow-hidden', dm ? 'bg-[#2A2A2A]' : 'bg-gray-100')}>
                      <div className="h-full transition-all duration-700" style={{ width: `${goal.progress}%`, background: goal.color }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><AlertCircle size={11} /> {goal.problems.length} Problems</span>
                    <span className="flex items-center gap-1"><Calendar size={11} /> Due {format(parseISO(goal.deadline), 'MMM d')}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// GoalDetail
// ─────────────────────────────────────────────
function GoalDetail({ goal, onBack, onAddProblem, onSelectProblem, onDeleteProblem, onDeleteGoal, onSetProgress, onUpdateTitle, onUpdateProblemDesc, dm }: any) {
  const [newProblem, setNewProblem] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showProgressSlider, setShowProgressSlider] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(goal.title);
  const [editingProblemId, setEditingProblemId] = useState<string | null>(null);
  const [problemInput, setProblemInput] = useState('');

  const metrics = useMemo(() => {
    const start = parseISO(goal.createdAt), end = parseISO(goal.deadline), now = new Date();
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
    const daysElapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / 86400000));
    const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));

    // Sum all logged minutes across all habits in this goal
    let totalMinutes = 0;
    let totalRatings = 0, ratingCount = 0;
    goal.problems.forEach((p: any) => p.hypotheses.forEach((h: any) => h.habits.forEach((hab: any) => hab.logs.forEach((l: any) => {
      totalMinutes += l.durationPerformed;
      if (l.rating) { totalRatings += l.rating; ratingCount++; }
    }))));

    const target = goal.targetValue;

    if (goal.type === 'time') {
      // Convert minutes to hours for display and comparison
      const totalHours = totalMinutes / 60;
      const dailyTargetHours = target / totalDays;
      const linearTargetHours = dailyTargetHours * Math.min(daysElapsed, totalDays);
      const deficitHours = linearTargetHours - totalHours;
      const adjustedDailyHours = daysRemaining > 0 ? (target - totalHours) / daysRemaining : 0;
      return {
        totalActual: totalHours,           // in hours
        totalActualDisplay: `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}m`,
        linearTarget: linearTargetHours,
        deficit: deficitHours,             // in hours
        adjustedDaily: adjustedDailyHours, // in hours/day
        originalDaily: dailyTargetHours,   // in hours/day
        daysRemaining,
        percentComplete: (totalHours / target) * 100,
        linearPercent: (linearTargetHours / target) * 100,
        isTime: true,
        avgRating: 0,
      };
    } else {
      // Rating goal — progress is manual, but show avg rating as insight
      const avgRating = ratingCount > 0 ? totalRatings / ratingCount : 0;
      return {
        totalActual: ratingCount,          // number of sessions rated
        totalActualDisplay: `${ratingCount} sessions`,
        linearTarget: 0,
        deficit: 0,
        adjustedDaily: 0,
        originalDaily: 0,
        daysRemaining,
        percentComplete: goal.progress,    // manual
        linearPercent: 0,
        isTime: false,
        avgRating,
      };
    }
  }, [goal]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-inherit transition-colors"><ArrowLeft size={17} /> Back</button>
        <button onClick={() => setConfirmDelete('goal')} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-500 transition-colors"><Trash2 size={14} /> Delete Goal</button>
      </div>

      {confirmDelete === 'goal' && (
        <div className={cn('border border-red-200 rounded-2xl p-5 space-y-3 bg-red-50')}>
          <p className="text-sm font-medium text-red-700">Delete "{goal.title}"? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={onDeleteGoal} className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors">Yes, Delete</button>
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-red-200 text-red-500 rounded-full text-sm font-medium hover:bg-red-50 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <header className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: goal.color }} />
          {editingTitle ? (
            <input
              autoFocus
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              onBlur={() => { if (titleInput.trim()) { onUpdateTitle(titleInput.trim()); } setEditingTitle(false); }}
              onKeyDown={e => { if (e.key === 'Enter' && titleInput.trim()) { onUpdateTitle(titleInput.trim()); setEditingTitle(false); } if (e.key === 'Escape') { setTitleInput(goal.title); setEditingTitle(false); } }}
              className={cn('text-3xl font-light tracking-tight bg-transparent border-b-2 focus:outline-none w-full', dm ? 'border-[#7A5230] text-white' : 'border-[#7A5230]')}
            />
          ) : (
            <button onClick={() => { setTitleInput(goal.title); setEditingTitle(true); }} className="text-3xl font-light tracking-tight text-left hover:opacity-70 transition-opacity group flex items-center gap-2">
              {goal.title}
              <Pencil size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
        </div>

        <div className={cn('space-y-4 p-6 rounded-3xl border', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-gray-50 border-gray-100')}>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Progress</p>
              {metrics.isTime ? (
                <p className="text-2xl font-light">{metrics.totalActualDisplay} <span className="text-sm text-gray-400">/ {goal.targetValue} {goal.targetUnit}</span></p>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-2xl font-light">{metrics.totalActual} <span className="text-sm text-gray-400">sessions rated</span></p>
                  {metrics.avgRating > 0 && <p className="text-sm text-amber-500 font-medium">Avg rating: {metrics.avgRating.toFixed(1)}/10</p>}
                </div>
              )}
            </div>
            <div className="text-right flex flex-col items-end gap-2">
              {metrics.isTime && (
                <p className={cn('text-sm font-medium', metrics.deficit > 0 ? 'text-red-400' : 'text-green-500')}>
                  {metrics.deficit > 0
                    ? `Behind by ${Math.abs(metrics.deficit).toFixed(1)}h`
                    : `Ahead by ${Math.abs(metrics.deficit).toFixed(1)}h`}
                </p>
              )}
              {goal.type === 'rating' && (
                <button onClick={() => setShowProgressSlider(!showProgressSlider)} style={{ color: BRAND }} className="text-xs underline underline-offset-2">Manual override</button>
              )}
            </div>
          </div>
          {showProgressSlider && goal.type === 'rating' && (
            <div className="space-y-2">
              <input type="range" min={0} max={100} value={goal.progress} onChange={e => onSetProgress(Number(e.target.value))} className="w-full accent-[#7A5230]" />
              <div className="flex justify-between text-[10px] text-gray-400 font-mono"><span>0%</span><span className="font-medium" style={{ color: BRAND }}>{goal.progress}%</span><span>100%</span></div>
            </div>
          )}
          <div className={cn('relative h-2.5 rounded-full overflow-hidden', dm ? 'bg-[#2A2A2A]' : 'bg-gray-200')}>
            {metrics.isTime && <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, metrics.linearPercent)}%` }} className="absolute top-0 left-0 h-full opacity-30 z-0 rounded-full" style={{ background: goal.color }} />}
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, metrics.percentComplete)}%` }} className="absolute top-0 left-0 h-full z-10 rounded-full" style={{ background: goal.color }} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Days Left', metrics.daysRemaining],
              metrics.isTime ? ['Orig. Daily', `${metrics.originalDaily.toFixed(1)}h/day`] : ['Sessions', metrics.totalActual],
              metrics.isTime ? ['Adj. Daily', `${Math.max(0, metrics.adjustedDaily).toFixed(1)}h/day`] : ['Avg Rating', metrics.avgRating > 0 ? `${metrics.avgRating.toFixed(1)}/10` : '—'],
            ].map(([label, val]) => (
              <div key={String(label)} className={cn('p-4 rounded-2xl space-y-1', dm ? 'bg-[#252525]' : 'bg-white border border-gray-100')}>
                <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">{label}</p>
                <p className="text-lg font-light">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <h2 className="text-xl font-medium">Obstacles & Problems</h2>
        <div className="relative">
          <input type="text" placeholder="What's standing in your way?" value={newProblem} onChange={e => setNewProblem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newProblem) { onAddProblem(newProblem); setNewProblem(''); } }}
            className={cn('w-full border rounded-2xl px-6 py-4 focus:outline-none transition-all', dm ? 'bg-[#1C1C1C] border-[#2A2A2A] text-white placeholder-gray-600 focus:border-[#7A5230]' : 'bg-white border-gray-100 focus:border-[#7A5230]')} />
          <button onClick={() => { if (newProblem) { onAddProblem(newProblem); setNewProblem(''); } }} style={{ background: BRAND }} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 text-white rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"><Plus size={16} /></button>
        </div>
        <div className="space-y-3">
          {goal.problems.map((p: Problem) => (
            <div key={p.id} className={cn('flex items-center justify-between border rounded-2xl p-5 group transition-all', dm ? 'bg-[#1C1C1C] border-[#2A2A2A] hover:border-[#7A5230]' : 'bg-white border-gray-100 hover:border-[#7A5230]')}>
              {editingProblemId === p.id ? (
                <input
                  autoFocus
                  value={problemInput}
                  onChange={e => setProblemInput(e.target.value)}
                  onBlur={() => { if (problemInput.trim()) onUpdateProblemDesc(p.id, problemInput.trim()); setEditingProblemId(null); }}
                  onKeyDown={e => { if (e.key === 'Enter' && problemInput.trim()) { onUpdateProblemDesc(p.id, problemInput.trim()); setEditingProblemId(null); } if (e.key === 'Escape') setEditingProblemId(null); }}
                  className={cn('flex-1 bg-transparent border-b-2 focus:outline-none font-medium', dm ? 'border-[#7A5230] text-white' : 'border-[#7A5230]')}
                />
              ) : (
                <button onClick={() => onSelectProblem(p.id)} className="flex items-center gap-4 flex-1 text-left">
                  <div className="w-9 h-9 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0"><AlertCircle size={18} /></div>
                  <span className="font-medium">{p.description}</span>
                </button>
              )}
              <div className="flex items-center gap-2 ml-3">
                <span className="text-xs text-gray-400 font-mono">{p.hypotheses.length} hyp.</span>
                <button onClick={() => { setProblemInput(p.description); setEditingProblemId(p.id); }} className="text-gray-300 hover:text-inherit opacity-0 group-hover:opacity-100 transition-all" title="Edit"><Pencil size={13} /></button>
                <button onClick={() => onDeleteProblem(p.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" title="Delete"><Trash2 size={14} /></button>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// ProblemDetail
// ─────────────────────────────────────────────
function ProblemDetail({ goal, problem, onBack, onAddHypothesis, onSelectHypothesis, onDeleteHypothesis, onUpdateHypothesisDesc, dm }: any) {
  const [newHyp, setNewHyp] = useState('');
  const [editingHypId, setEditingHypId] = useState<string | null>(null);
  const [hypInput, setHypInput] = useState('');
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-inherit transition-colors"><ArrowLeft size={17} /> Back</button>
      <header>
        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1"><Target size={10} /> {goal.title}</p>
        <h1 className="text-2xl font-light flex items-center gap-3"><span className="text-red-500"><AlertCircle size={28} /></span>{problem.description}</h1>
      </header>
      <section className="space-y-6">
        <h2 className="text-xl font-medium">Hypothesis Builder</h2>
        <div className="relative">
          <textarea placeholder="If I [do this], then [this problem will be solved]..." value={newHyp} onChange={e => setNewHyp(e.target.value)}
            className={cn('w-full border rounded-2xl px-6 py-5 focus:outline-none min-h-[110px] resize-none transition-all', dm ? 'bg-[#1C1C1C] border-[#2A2A2A] text-white placeholder-gray-600 focus:border-[#7A5230]' : 'bg-white border-gray-100 focus:border-[#7A5230]')} />
          <button onClick={() => { if (newHyp) { onAddHypothesis(newHyp); setNewHyp(''); } }} style={{ background: BRAND }} className="absolute right-4 bottom-4 text-white px-5 py-1.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">Add</button>
        </div>
        <div className="space-y-4">
          {problem.hypotheses.map((h: Hypothesis, idx: number) => (
            <div key={h.id} className={cn('border rounded-2xl p-7 group transition-all', dm ? 'bg-[#1C1C1C] border-[#2A2A2A] hover:border-[#7A5230]' : 'bg-white border-gray-100 hover:border-[#7A5230]')}>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Experiment #{idx + 1}</span>
                  {editingHypId === h.id ? (
                    <textarea
                      autoFocus
                      value={hypInput}
                      onChange={e => setHypInput(e.target.value)}
                      onBlur={() => { if (hypInput.trim()) onUpdateHypothesisDesc(h.id, hypInput.trim()); setEditingHypId(null); }}
                      onKeyDown={e => { if (e.key === 'Escape') setEditingHypId(null); }}
                      className={cn('w-full bg-transparent border-b-2 focus:outline-none resize-none font-serif italic text-base leading-relaxed', dm ? 'border-[#7A5230] text-white' : 'border-[#7A5230]')}
                      rows={2}
                    />
                  ) : (
                    <button onClick={() => onSelectHypothesis(h.id)} className="text-left w-full">
                      <p className="text-base font-serif italic leading-relaxed">"{h.description}"</p>
                    </button>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Calendar size={11} /> {h.habits.length} Habits</span>
                    <span className="flex items-center gap-1"><History size={11} /> {h.testCount} Tests</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => { setHypInput(h.description); setEditingHypId(h.id); }} className="text-gray-300 hover:text-inherit opacity-0 group-hover:opacity-100 transition-all" title="Edit"><Pencil size={13} /></button>
                  <ChevronRight size={14} className="text-gray-300" />
                  <button onClick={() => onDeleteHypothesis(h.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// HypothesisDetail
// ─────────────────────────────────────────────
function HypothesisDetail({ goal, problem, hypothesis, onBack, onAddHabit, onDeleteHabit, onUpdateHabit, onArchiveHabit, onAddJournalNote, onMoveHabit, goalType, dm }: any) {
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [journalHabitId, setJournalHabitId] = useState<string | null>(null);
  const journalHabit = hypothesis.habits.find((h: Habit) => h.id === journalHabitId);
  const activeHabits = hypothesis.habits.filter((h: Habit) => !h.archived);
  const archivedHabits = hypothesis.habits.filter((h: Habit) => h.archived);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-inherit transition-colors"><ArrowLeft size={17} /> Back</button>
      <header>
        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1"><AlertCircle size={10} /> {problem.description}</p>
        <h1 className="text-2xl font-light flex items-center gap-3"><span className="text-amber-500"><Lightbulb size={28} /></span>{hypothesis.description}</h1>
      </header>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Habit Planner</h2>
          <button onClick={() => setIsAddingHabit(true)} style={{ color: BRAND }} className="text-sm font-medium underline underline-offset-4">Add Habit</button>
        </div>

        {activeHabits.length === 0 ? (
          <div className={cn('border border-dashed rounded-2xl p-12 text-center space-y-4', dm ? 'border-[#2A2A2A]' : 'border-gray-200')}>
            <Calendar className="mx-auto text-gray-300" size={40} />
            <p className="text-gray-400">No habits yet.</p>
            <button onClick={() => setIsAddingHabit(true)} style={{ background: BRAND }} className="text-white px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">Create First Habit</button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeHabits.map((habit: Habit) => (
              <div key={habit.id} className={cn('border rounded-2xl p-5 group transition-all', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-100')}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{habit.title}</h3>
                      {getHabitStreak(habit) > 0 && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-mono" style={{ background: BRAND }}><Flame size={9} /> {getHabitStreak(habit)}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {goalType === 'time' && <><span className="flex items-center gap-1"><Clock size={11} /> {habit.startTime}</span><span className="flex items-center gap-1"><Timer size={11} /> {habit.duration}m</span></>}
                      <span className="flex items-center gap-1"><Calendar size={11} /> {habit.days.length}d/wk</span>
                      {(habit.journal?.length || 0) > 0 && <span className="flex items-center gap-1"><BookOpen size={11} /> {habit.journal!.length}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {['S','M','T','W','T','F','S'].map((d, i) => (
                        <span key={i} className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-mono', habit.days.includes(i) ? 'text-white' : dm ? 'bg-[#2A2A2A] text-gray-600' : 'bg-gray-50 text-gray-300')} style={habit.days.includes(i) ? { background: BRAND } : {}}>{d}</span>
                      ))}
                    </div>
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => onMoveHabit(habit.id, 'up')} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-inherit transition-colors" title="Move up">
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                      </button>
                      <button onClick={() => onMoveHabit(habit.id, 'down')} className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-inherit transition-colors" title="Move down">
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                    </div>
                    {/* Action buttons */}
                    <button onClick={() => setJournalHabitId(habit.id)} className="w-7 h-7 rounded-full border flex items-center justify-center text-gray-400 hover:text-inherit transition-all opacity-0 group-hover:opacity-100" style={{ borderColor: 'currentColor' }} title="Journal"><BookOpen size={12} /></button>
                    <button onClick={() => setEditingHabit(habit)} className="w-7 h-7 rounded-full border flex items-center justify-center text-gray-400 hover:text-inherit transition-all opacity-0 group-hover:opacity-100" title="Edit"><Pencil size={12} /></button>
                    <button onClick={() => onArchiveHabit(habit.id)} className="w-7 h-7 rounded-full border flex items-center justify-center text-gray-400 hover:text-amber-500 transition-all opacity-0 group-hover:opacity-100" title="Archive"><Archive size={12} /></button>
                    <button onClick={() => onDeleteHabit(habit.id)} className="w-7 h-7 rounded-full border flex items-center justify-center text-gray-400 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100" title="Delete"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Archived habits */}
        {archivedHabits.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 flex items-center gap-2"><Archive size={11} /> Archived ({archivedHabits.length})</p>
            {archivedHabits.map((habit: Habit) => (
              <div key={habit.id} className={cn('border rounded-xl p-4 flex items-center justify-between opacity-50', dm ? 'border-[#2A2A2A] bg-[#1C1C1C]' : 'border-gray-100 bg-white')}>
                <span className="text-sm text-gray-400 line-through">{habit.title}</span>
                <button onClick={() => onArchiveHabit(habit.id)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-inherit transition-colors"><ArchiveRestore size={12} /> Restore</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {journalHabit && <HabitJournalPanel habit={journalHabit} onClose={() => setJournalHabitId(null)} onAddNote={(t: string) => onAddJournalNote(journalHabit.id, t)} dm={dm} />}
        {isAddingHabit && <HabitFormModal onClose={() => setIsAddingHabit(false)} onSubmit={(h: any) => { onAddHabit(h); setIsAddingHabit(false); }} goalType={goalType} dm={dm} />}
        {editingHabit && <HabitFormModal initial={editingHabit} onClose={() => setEditingHabit(null)} onSubmit={(h: any) => { onUpdateHabit(editingHabit.id, h); setEditingHabit(null); }} goalType={goalType} dm={dm} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Habit Journal Panel
// ─────────────────────────────────────────────
function HabitJournalPanel({ habit, onClose, onAddNote, dm }: { habit: Habit; onClose: () => void; onAddNote: (t: string) => void; dm: boolean }) {
  const [note, setNote] = useState('');
  const entries = [...(habit.journal || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex justify-end">
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className={cn('w-full md:w-[400px] h-full flex flex-col', dm ? 'bg-[#1C1C1C]' : 'bg-white')}>
        <div className={cn('p-7 border-b flex items-start justify-between', dm ? 'border-[#2A2A2A]' : 'border-gray-100')}>
          <div><div className="flex items-center gap-2 mb-0.5"><BookOpen size={15} style={{ color: BRAND }} /><h2 className="font-medium">Journal</h2></div><p className={cn('text-sm font-serif italic', dm ? 'text-gray-400' : 'text-gray-500')}>{habit.title}</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-inherit transition-colors"><X size={19} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-7 space-y-5">
          {entries.length === 0 ? (
            <div className="text-center py-12"><BookOpen className="mx-auto text-gray-200 mb-3" size={36} /><p className="text-gray-400 text-sm">No notes yet. Start capturing your observations.</p></div>
          ) : entries.map(e => (
            <div key={e.id} className={cn('space-y-1 border-b pb-4 last:border-0', dm ? 'border-[#2A2A2A]' : 'border-gray-50')}>
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">{format(parseISO(e.date), 'MMM d · HH:mm')}</p>
              <p className={cn('text-sm leading-relaxed', dm ? 'text-gray-300' : 'text-gray-700')}>{e.text}</p>
            </div>
          ))}
        </div>
        <div className={cn('p-5 border-t space-y-3', dm ? 'border-[#2A2A2A]' : 'border-gray-100')}>
          <textarea autoFocus placeholder="Write your observation..." value={note} onChange={e => setNote(e.target.value)} className={cn('w-full border-none rounded-2xl px-5 py-4 focus:ring-1 focus:outline-none min-h-[80px] resize-none text-sm', dm ? 'bg-[#252525] text-white placeholder-gray-600 focus:ring-[#7A5230]' : 'bg-gray-50 focus:ring-[#7A5230]')} />
          <button disabled={!note.trim()} onClick={() => { if (note.trim()) { onAddNote(note.trim()); setNote(''); } }} style={{ background: BRAND }} className="w-full text-white py-3 rounded-2xl text-sm font-medium disabled:opacity-30 hover:opacity-90 transition-opacity">Add Note</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Settings Screen
// ─────────────────────────────────────────────
function SettingsScreen({ dm, onToggleDark, onExport, onClearData, userEmail, onOpenAccount, onUpgrade, onReplayIntro }: any) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const row = (label: string, sub: string, action: React.ReactNode) => (
    <div className={cn('flex items-center justify-between p-5 border-b last:border-0', dm ? 'border-[#2A2A2A]' : 'border-gray-50')}>
      <div><p className="font-medium text-sm">{label}</p><p className="text-xs text-gray-400">{sub}</p></div>
      {action}
    </div>
  );
  const section = (title: string, children: React.ReactNode) => (
    <div className="space-y-2">
      <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 px-1">{title}</p>
      <div className={cn('border rounded-2xl overflow-hidden', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-100')}>{children}</div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-4xl font-light tracking-tight">Settings</h1>
        <p className={cn('font-serif italic', dm ? 'text-gray-400' : 'text-gray-500')}>Configure your Evolv experience.</p>
      </header>

      {section('Account', <>
        {row(
          userEmail ? 'Signed in' : 'Register Email',
          userEmail ? userEmail : 'Save your email to prepare for cloud sync',
          <button onClick={onOpenAccount} style={{ color: BRAND }} className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center gap-1">
            {userEmail ? 'Manage' : 'Add Email'} <ChevronRight size={14} />
          </button>
        )}
      </>)}

      {section('Plan', <>
        {row('Current Plan', 'Free — 3 goals · 5 habits per hypothesis', <span className="text-xs font-mono px-3 py-1 rounded-full text-white" style={{ background: BRAND }}>Free</span>)}
        {row('Evolv Pro', 'Unlimited goals, habits, full analytics & more', (
          <button onClick={onUpgrade} style={{ color: BRAND }} className="text-sm font-medium hover:opacity-70 transition-opacity">
            See Plans →
          </button>
        ))}
      </>)}

      {section('Appearance', row('Dark Mode', dm ? 'Currently on dark theme' : 'Currently on light theme', (
        <button onClick={onToggleDark} className={cn('w-12 h-6 rounded-full transition-all relative', dm ? 'bg-[#7A5230]' : 'bg-gray-200')}>
          <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm', dm ? 'left-7' : 'left-1')} />
        </button>
      )))}

      {section('Notifications', row('Habit Reminders', 'Get notified 5 min before each habit', (
        <span className="text-xs text-gray-400 font-mono">Managed by browser</span>
      )))}

      {section('Data', <>
        {row('Export CSV', 'Download all your habit logs', <button onClick={onExport} style={{ color: BRAND }} className="flex items-center gap-1.5 text-sm font-medium hover:opacity-70 transition-opacity"><Download size={15} /> Export</button>)}
        {row('Clear All Data', 'Permanently delete all goals and tasks', confirmClear ? (
          <div className="flex items-center gap-2">
            <button onClick={() => { onClearData(); setConfirmClear(false); }} className="px-3 py-1.5 bg-red-500 text-white rounded-full text-xs font-medium">Confirm</button>
            <button onClick={() => setConfirmClear(false)} className="px-3 py-1.5 border border-gray-200 rounded-full text-xs">Cancel</button>
          </div>
        ) : <button onClick={() => setConfirmClear(true)} className="text-sm text-red-400 hover:text-red-500 font-medium transition-colors">Clear Data</button>)}
      </>)}

      {section('About', <>
        {row(`Evolv v${APP_VERSION}`, 'Latest release', <button onClick={() => setShowChangelog(true)} style={{ color: BRAND }} className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center gap-1"><Info size={14} /> What's new</button>)}
        {row('View Intro', 'Replay the onboarding walkthrough', <button onClick={onReplayIntro} style={{ color: BRAND }} className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center gap-1">View <ChevronRight size={14} /></button>)}
        {row('Made with', 'React · TypeScript · Tailwind · Framer Motion', <Shield size={16} className="text-gray-300" />)}
      </>)}

      <AnimatePresence>{showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} dm={dm} />}</AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────
function Analytics({ goals, onExport, onDeleteLog, dm }: any) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const now = new Date();
  const axisColor = dm ? '#4B5563' : '#9CA3AF';
  const gridColor = dm ? '#1F2937' : '#F3F4F6';
  const tooltipStyle = { borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)', background: dm ? '#1C1C1C' : '#fff', color: dm ? '#fff' : '#1A1A1A' };

  const stats = useMemo(() => {
    const build = (days: Date[]) => days.map(day => {
      let actual = 0, target = 0, totalRating = 0, ratingCount = 0;
      goals.forEach((g: Goal) => g.problems.forEach((p: Problem) => p.hypotheses.forEach((h: Hypothesis) => h.habits.forEach((hab: Habit) => {
        if (!hab.archived && hab.days.includes(day.getDay())) target += hab.duration;
        hab.logs.forEach(log => { if (isSameDay(parseISO(log.date), day)) { actual += log.durationPerformed; if (log.rating) { totalRating += log.rating; ratingCount++; } } });
      }))));
      return { name: format(day, 'EEE'), actual, target, deficit: Math.max(0, target - actual), avgRating: ratingCount > 0 ? +(totalRating / ratingCount).toFixed(1) : 0 };
    });

    if (timeRange === 'week') return build(eachDayOfInterval({ start: startOfWeek(now), end: endOfWeek(now) }));
    if (timeRange === 'day') {
      return goals.flatMap((g: Goal) => g.problems.flatMap((p: Problem) => p.hypotheses.flatMap((h: Hypothesis) => h.habits.filter((hab: Habit) => !hab.archived && hab.days.includes(now.getDay())).map((hab: Habit) => {
        // Sum ALL logs for today, not just find the first one
        const todayLogs = hab.logs.filter(l => isSameDay(parseISO(l.date), now));
        const actual = todayLogs.reduce((sum, l) => sum + l.durationPerformed, 0);
        const avgRating = todayLogs.filter(l => l.rating).length > 0
          ? +(todayLogs.filter(l => l.rating).reduce((s, l) => s + (l.rating || 0), 0) / todayLogs.filter(l => l.rating).length).toFixed(1)
          : 0;
        return { name: hab.title.slice(0, 10), actual, target: hab.duration, deficit: Math.max(0, hab.duration - actual), avgRating };
      }))));
    }
    if (timeRange === 'month') {
      return eachWeekOfInterval({ start: startOfMonth(now), end: endOfMonth(now) }).map((ws, i) => {
        const we = endOfWeek(ws); let actual = 0, target = 0;
        goals.forEach((g: Goal) => g.problems.forEach((p: Problem) => p.hypotheses.forEach((h: Hypothesis) => h.habits.forEach((hab: Habit) => {
          eachDayOfInterval({ start: ws < startOfMonth(now) ? startOfMonth(now) : ws, end: we > endOfMonth(now) ? endOfMonth(now) : we }).forEach(d => { if (!hab.archived && hab.days.includes(d.getDay())) target += hab.duration; });
          hab.logs.forEach(l => { if (isWithinInterval(parseISO(l.date), { start: ws, end: we }) && isSameMonth(parseISO(l.date), now)) actual += l.durationPerformed; });
        }))));
        return { name: `W${i + 1}`, actual, target, deficit: Math.max(0, target - actual), avgRating: 0 };
      });
    }
    return eachMonthOfInterval({ start: startOfYear(now), end: endOfYear(now) }).map(month => {
      let actual = 0, target = 0;
      goals.forEach((g: Goal) => g.problems.forEach((p: Problem) => p.hypotheses.forEach((h: Hypothesis) => h.habits.forEach((hab: Habit) => {
        eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }).forEach(d => { if (!hab.archived && hab.days.includes(d.getDay())) target += hab.duration; });
        hab.logs.forEach(l => { if (isSameMonth(parseISO(l.date), month) && isSameYear(parseISO(l.date), now)) actual += l.durationPerformed; });
      }))));
      return { name: format(month, 'MMM'), actual, target, deficit: Math.max(0, target - actual), avgRating: 0 };
    });
  }, [goals, timeRange]);

  const dailyRecords = useMemo(() => {
    const records: any[] = [];
    goals.forEach((g: Goal) => g.problems.forEach((p: Problem) => p.hypotheses.forEach((h: Hypothesis) => h.habits.forEach((hab: Habit) => hab.logs.forEach(log => {
      const ld = parseISO(log.date);
      const inc = (timeRange === 'day' && isSameDay(ld, now)) || (timeRange === 'week' && isSameWeek(ld, now)) || (timeRange === 'month' && isSameMonth(ld, now)) || (timeRange === 'year' && isSameYear(ld, now));
      if (inc) records.push({ id: log.id, habitId: hab.id, date: log.date, habitTitle: hab.title, goalTitle: g.title, duration: log.durationPerformed, target: hab.duration, rating: log.rating, reflection: log.reflection, color: g.color });
    })))));
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [goals, timeRange]);

  const goalDist = useMemo(() => goals.map((g: Goal) => {
    let total = 0;
    g.problems.forEach((p: Problem) => p.hypotheses.forEach((h: Hypothesis) => h.habits.forEach((hab: Habit) => hab.logs.forEach(l => { total += l.durationPerformed; }))));
    return { name: g.title, value: total, color: g.color };
  }).filter((x: any) => x.value > 0), [goals]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <h1 className="text-4xl font-light tracking-tight">Analytics</h1>
          <p className={cn('font-serif italic', dm ? 'text-gray-400' : 'text-gray-500')}>Measuring your evolution.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn('border rounded-full p-1 flex gap-1', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-100')}>
            {(['day', 'week', 'month', 'year'] as const).map(r => (
              <button key={r} onClick={() => setTimeRange(r)} className={cn('px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize', timeRange === r ? 'text-white' : (dm ? 'text-gray-400 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'))} style={timeRange === r ? { background: BRAND } : {}}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={onExport} className={cn('border px-5 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 transition-colors', dm ? 'border-[#2A2A2A] hover:border-[#7A5230] text-gray-300' : 'border-gray-200 hover:border-[#7A5230]')}>
            <Download size={16} />
          </button>
        </div>
      </header>

      {/* Heatmap */}
      <div className={cn('border rounded-2xl p-7 space-y-4', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-100')}>
        <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400">Completion Heatmap — Last 16 Weeks</h3>
        <HeatmapCalendar goals={goals} dm={dm} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        {[
          { title: 'Actual vs Target (min)', keys: [{ k: 'actual', c: BRAND }, { k: 'target', c: dm ? '#2A2A2A' : '#E5E7EB' }] },
          { title: 'Daily Deficit', keys: [{ k: 'deficit', c: '#F87171' }] },
        ].map(({ title, keys }) => (
          <div key={title} className={cn('border rounded-2xl p-7 space-y-5', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-100')}>
            <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400">{title}</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} />
                  <Tooltip cursor={{ fill: dm ? '#252525' : '#F9FAFB' }} contentStyle={tooltipStyle} />
                  {keys.map(({ k, c }) => <Bar key={k} dataKey={k} fill={c} radius={[4, 4, 0, 0]} barSize={18} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        <div className="lg:col-span-2">
          <div className={cn('border rounded-2xl p-7 space-y-5', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-100')}>
            <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400">Records — this {timeRange}</h3>
            {dailyRecords.length === 0 ? <p className="text-gray-400 text-sm italic text-center py-8">No records found.</p> : (
              <div className="space-y-4">
                {dailyRecords.map((r: any) => (
                  <div key={r.id} className={cn('border-b last:border-0 pb-4 last:pb-0 space-y-1.5 group', dm ? 'border-[#2A2A2A]' : 'border-gray-50')}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                        <span className="text-sm font-medium">{r.habitTitle}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{r.goalTitle}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-400">{format(parseISO(r.date), 'MMM d HH:mm')}</span>
                        <button
                          onClick={() => onDeleteLog(r.habitId, r.id)}
                          className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          title="Delete log"
                        ><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={cn('font-mono font-medium', r.duration < r.target ? 'text-red-400' : 'text-emerald-500')}>{r.duration}m</span>
                      <span className="text-gray-400">/ {r.target}m target</span>
                      {r.rating && <span className="text-amber-500 font-medium">{r.rating}/10</span>}
                    </div>
                    {r.reflection && <p className={cn('text-xs italic line-clamp-1', dm ? 'text-gray-400' : 'text-gray-500')}>"{r.reflection}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-7">
          <div className={cn('border rounded-2xl p-7 space-y-4', dm ? 'bg-[#1C1C1C] border-[#2A2A2A]' : 'bg-white border-gray-100')}>
            <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400">Goal Distribution</h3>
            {goalDist.length === 0 ? <p className="text-gray-400 text-sm italic text-center py-8">No data yet.</p> : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={goalDist} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {goalDist.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                  </Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-2xl p-7 space-y-5 text-white" style={{ background: BRAND }}>
            <h3 className="text-xs font-mono uppercase tracking-widest opacity-60">Insights</h3>
            {[
              ['Total Time', `${Math.floor(goalDist.reduce((a: number, c: any) => a + c.value, 0) / 60)}h ${goalDist.reduce((a: number, c: any) => a + c.value, 0) % 60}m`],
              ['Target Rate', `${dailyRecords.length > 0 ? Math.round((dailyRecords.filter((r: any) => r.duration >= r.target).length / dailyRecords.length) * 100) : 0}%`],
              ['Missed', `${dailyRecords.filter((r: any) => r.duration < r.target).length} targets`],
            ].map(([label, val]) => (
              <div key={label} className="space-y-0.5">
                <p className="text-xs opacity-60">{label}</p>
                <p className="text-xl font-light">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Heatmap
// ─────────────────────────────────────────────
function HeatmapCalendar({ goals, dm }: { goals: Goal[]; dm: boolean }) {
  const today = new Date();
  const startDate = subDays(today, 111);
  const actMap = useMemo(() => {
    const m: Record<string, number> = {};
    goals.forEach(g => g.problems.forEach(p => p.hypotheses.forEach(h => h.habits.forEach(hab => hab.logs.forEach(log => { const k = format(parseISO(log.date), 'yyyy-MM-dd'); m[k] = (m[k] || 0) + 1; })))));
    return m;
  }, [goals]);
  const days = eachDayOfInterval({ start: startDate, end: today });
  const padded = [...Array(startDate.getDay()).fill(null), ...days];
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  const getColor = (n: number) => n === 0 ? (dm ? '#1F2937' : '#E5E7EB') : n <= 1 ? '#DBC8B0' : n <= 3 ? '#A07850' : BRAND;
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((wk, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {wk.map((day, di) => (
              <div key={di} className="w-3 h-3 rounded-sm transition-colors" style={{ background: day ? getColor(actMap[format(day, 'yyyy-MM-dd')] || 0) : 'transparent' }}
                title={day ? `${format(day, 'MMM d')}: ${actMap[format(day, 'yyyy-MM-dd')] || 0} habits` : ''} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400 font-mono uppercase tracking-widest">
        <span>Less</span>{[0, 1, 2, 4].map(n => <div key={n} className="w-3 h-3 rounded-sm" style={{ background: getColor(n) }} />)}<span>More</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Modals
// ─────────────────────────────────────────────
function GoalFormModal({ onClose, onSubmit, dm }: any) {
  const [step, setStep] = useState(1);
  const [currentState, setCurrentState] = useState('');
  const [targetState, setTargetState] = useState('');
  const [trackType, setTrackType] = useState<GoalType>('time');
  const [targetValue, setTargetValue] = useState<number>(0);
  const [targetUnit, setTargetUnit] = useState('');
  const [deadline, setDeadline] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [color, setColor] = useState(`linear-gradient(135deg, ${BRAND} 0%, #4A2C18 100%)`);
  const [selectedMethod, setSelectedMethod] = useState<string>('time');

  const colors = [
    `linear-gradient(135deg, ${BRAND} 0%, #4A2C18 100%)`,
    'linear-gradient(135deg, #1A1A1A 0%, #4A4A4A 100%)',
    'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
    'linear-gradient(135deg, #10B981 0%, #047857 100%)',
    'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)',
    'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
  ];

  // Strip commas as user types — enforce single clear sentence
  const clean = (v: string) => v.replace(/,/g, '');

  const goalSentence = currentState && targetState
    ? `From ${currentState} to ${targetState}`
    : '';

  const step1Valid = currentState.trim().length >= 5 && targetState.trim().length >= 5;
  const step2Valid = selectedMethod !== '';
  const step3Valid = deadline.trim().length > 0 && (
    selectedMethod === 'checklist' || selectedMethod === 'rating'
      ? targetUnit.trim().length > 0
      : targetValue > 0 && targetUnit.trim().length > 0
  );

  const inputCls = cn(
    'w-full text-lg font-light border-b-2 focus:outline-none py-3 transition-all placeholder-gray-300',
    dm ? 'bg-transparent text-white border-[#2A2A2A] focus:border-[#7A5230]' : 'border-gray-100 focus:border-[#7A5230]'
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={cn('w-full max-w-xl rounded-3xl relative flex flex-col', dm ? 'bg-[#1C1C1C] text-white' : 'bg-white')}
        style={{ maxHeight: '90vh' }}
      >
        {/* Progress bar */}
        <div className={cn('h-1 w-full rounded-t-3xl shrink-0', dm ? 'bg-[#2A2A2A]' : 'bg-gray-100')}>
          <motion.div animate={{ width: `${(step / 3) * 100}%` }} transition={{ duration: 0.4 }} className="h-full rounded-t-3xl" style={{ background: BRAND }} />
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-8 md:px-10 pt-8 md:pt-10 space-y-7 min-h-0">
          <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-inherit transition-colors"><X size={20} /></button>

          <AnimatePresence mode="wait">

            {/* ── Step 1: The Gap ────────────────── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-7 pb-2">
                {/* Tom Bilyeu quote */}
                <div className="rounded-2xl p-5 space-y-2" style={{ background: `${BRAND}15` }}>
                  <p className="text-sm font-serif italic leading-relaxed" style={{ color: BRAND }}>
                    "The gap between where you are and where you want to be is the only thing you need to be honest about. Everything else is noise."
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">— Tom Bilyeu</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Step 1 of 3 — Define the Gap</p>
                  <h2 className="text-2xl font-light">Be brutally honest.</h2>
                  <p className="text-sm text-gray-400">No commas. One clear thought per line. No fluff.</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Where are you RIGHT NOW?</label>
                    <input
                      autoFocus
                      type="text"
                      value={currentState}
                      onChange={e => setCurrentState(clean(e.target.value))}
                      placeholder="e.g. I study 0 hours per day"
                      className={inputCls}
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Where exactly will you BE?</label>
                    <input
                      type="text"
                      value={targetState}
                      onChange={e => setTargetState(clean(e.target.value))}
                      placeholder="e.g. I study 2 focused hours every day"
                      className={inputCls}
                      maxLength={80}
                    />
                  </div>
                </div>

                {/* Live sentence preview */}
                {goalSentence && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn('rounded-2xl p-4 space-y-1 border', dm ? 'bg-[#252525] border-[#3A3A3A]' : 'bg-gray-50 border-gray-100')}>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Your goal sentence</p>
                    <p className="text-base font-medium leading-snug">"{goalSentence}"</p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── Step 2: How to Track ───────────── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5 pb-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Step 2 of 3 — How to Track</p>
                  <h2 className="text-2xl font-light">How will you measure it?</h2>
                  <p className="text-sm text-gray-400">Not all goals are tracked the same way.</p>
                </div>

                <div className={cn('rounded-2xl px-4 py-3 border', dm ? 'border-[#2A2A2A]' : 'border-gray-100')}>
                  <p className="text-[10px] font-mono text-gray-400 mb-1 uppercase tracking-widest">Your goal</p>
                  <p className="text-sm font-medium">"{goalSentence}"</p>
                </div>

                <div className="space-y-2">
                  {[
                    { id: 'time',      emoji: '⏱', label: 'Time Spent',       desc: 'Log hours or minutes per session. Study, deep work, practice.',  type: 'time'   as GoalType, hint: 'hours'    },
                    { id: 'count',     emoji: '🔢', label: 'Count / Reps',     desc: 'Track a number each session — pages, km, reps, chapters.',       type: 'time'   as GoalType, hint: 'pages'    },
                    { id: 'score',     emoji: '🎯', label: 'Reach a Target',   desc: 'Hit a specific value — exam score, weight, savings, level.',     type: 'time'   as GoalType, hint: 'points'   },
                    { id: 'rating',    emoji: '⭐', label: 'Quality Rating',   desc: 'Rate yourself 1–10. Performance, mood, meditation.',             type: 'rating' as GoalType, hint: 'sessions' },
                    { id: 'checklist', emoji: '✅', label: 'Done / Not Done',  desc: 'Mark daily completion. No timer. Routines and streaks.',         type: 'rating' as GoalType, hint: 'days'     },
                  ].map(opt => {
                    const isSelected = selectedMethod === opt.id;
                    return (
                      <button key={opt.id}
                        onClick={() => { setSelectedMethod(opt.id); setTrackType(opt.type); if (!targetUnit) setTargetUnit(opt.hint); }}
                        className={cn('w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3', isSelected ? 'border-[#7A5230]' : dm ? 'border-[#2A2A2A] hover:border-[#3A3A3A]' : 'border-gray-100 hover:border-gray-200')}
                        style={isSelected ? { background: `${BRAND}10` } : {}}
                      >
                        <span className="text-xl mt-0.5 shrink-0">{opt.emoji}</span>
                        <div className="flex-1 space-y-0.5">
                          <p className="font-medium text-sm">{opt.label}</p>
                          <p className="text-[10px] text-gray-400">{opt.desc}</p>
                        </div>
                        {isSelected && <span className="shrink-0 text-sm font-bold" style={{ color: BRAND }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Measure + Commit ────────── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5 pb-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Step 3 of 3 — Commit</p>
                  <h2 className="text-2xl font-light">Put a number on it.</h2>
                  <p className="text-sm text-gray-400">A goal without a measurable target is a wish.</p>
                </div>

                {/* Target input — adapts to method */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                    {selectedMethod === 'checklist' || selectedMethod === 'rating' ? 'What will you call your sessions?' : 'What\'s the specific target?'}
                  </label>
                  <div className="flex gap-3">
                    {selectedMethod !== 'checklist' && selectedMethod !== 'rating' && (
                      <input autoFocus type="number" min={1} placeholder="e.g. 60" value={targetValue || ''}
                        onChange={e => setTargetValue(Number(e.target.value))} className={cn(inputCls, 'w-1/3')} />
                    )}
                    <input
                      autoFocus={selectedMethod === 'checklist' || selectedMethod === 'rating'}
                      type="text"
                      placeholder={selectedMethod === 'checklist' ? 'days, sessions…' : selectedMethod === 'rating' ? 'sessions, runs…' : 'hours, pages, km…'}
                      value={targetUnit}
                      onChange={e => setTargetUnit(e.target.value)}
                      className={cn(inputCls, selectedMethod === 'checklist' || selectedMethod === 'rating' ? 'w-full' : 'w-2/3')}
                    />
                  </div>
                </div>

                {/* Deadline */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Deadline — when will you be there?</label>
                  <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
                    className={cn('w-full rounded-2xl px-5 py-3.5 border focus:outline-none transition-all', dm ? 'bg-[#252525] border-[#2A2A2A] text-white focus:border-[#7A5230]' : 'bg-gray-50 border-transparent focus:border-[#7A5230]')} />
                </div>

                {/* Goal preview card */}
                <div className="rounded-2xl p-5 space-y-3 text-white" style={{ background: color }}>
                  <p className="text-base font-light leading-snug">"{goalSentence}"</p>
                  <div className="flex items-center gap-3 text-xs opacity-80 flex-wrap">
                    <span>🎯 {(selectedMethod === 'checklist' || selectedMethod === 'rating') ? targetUnit : `${targetValue} ${targetUnit}`}</span>
                    <span>📅 by {deadline ? format(parseISO(deadline), 'MMM d, yyyy') : '—'}</span>
                    <span>{{ time: '⏱', count: '🔢', score: '🎯', rating: '⭐', checklist: '✅' }[selectedMethod] || '⏱'} {{ time: 'Time Spent', count: 'Count', score: 'Score', rating: 'Rating', checklist: 'Checklist' }[selectedMethod] || 'Time'}</span>
                  </div>
                </div>

                {/* Color picker */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Goal color</label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map(c => (
                      <button key={c} onClick={() => setColor(c)}
                        className={cn('w-9 h-9 rounded-xl shadow-sm transition-all', color === c ? 'ring-2 ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100')}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Navigation — always pinned at bottom, never scrolls away */}
        <div className={cn('px-8 md:px-10 pb-8 pt-4 flex items-center justify-between shrink-0 border-t', dm ? 'border-[#2A2A2A]' : 'border-gray-100')}>
          {step > 1
            ? <button onClick={() => setStep(step - 1)} className="text-gray-400 font-medium hover:text-inherit transition-colors">← Back</button>
            : <div />
          }
          {step < 3 ? (
            <button
              disabled={step === 1 ? !step1Valid : !step2Valid}
              onClick={() => setStep(step + 1)}
              style={{ background: BRAND }}
              className="text-white px-8 py-3 rounded-full font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
            >
              Next →
            </button>
          ) : (
            <button
              disabled={!step3Valid}
              onClick={() => onSubmit({ title: goalSentence, type: trackType, deadline, targetValue, targetUnit, color })}
              style={{ background: BRAND }}
              className="text-white px-8 py-3 rounded-full font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
            >
              Create Goal
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function TaskFormModal({ onClose, onSubmit, dm }: any) {
  const [title, setTitle] = useState('');
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn('relative w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-7', dm ? 'bg-[#1C1C1C] text-white' : 'bg-white')}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-light">Add Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-inherit transition-colors"><X size={20} /></button>
        </div>
        <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && title) onSubmit(title); }} placeholder="What needs to be done?" className={cn('w-full rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 transition-all', dm ? 'bg-[#252525] text-white placeholder-gray-600 focus:ring-[#7A5230]' : 'bg-gray-50 focus:ring-[#7A5230]')} />
        <button onClick={() => title && onSubmit(title)} style={{ background: BRAND }} className="w-full text-white py-4 rounded-2xl font-medium hover:opacity-90 transition-opacity disabled:opacity-30" disabled={!title}>Add to Checklist</button>
      </motion.div>
    </div>
  );
}

function HabitFormModal({ onClose, onSubmit, goalType, dm, initial }: any) {
  const isRating = goalType === 'rating';
  const [form, setForm] = useState(initial ? { title: initial.title, days: initial.days, startTime: initial.startTime, duration: initial.duration, showInChecklist: initial.showInChecklist } : { title: '', days: [1, 2, 3, 4, 5], startTime: '09:00', duration: 30, showInChecklist: isRating });
  const [showTemplates, setShowTemplates] = useState(false);
  const toggle = (d: number) => setForm({ ...form, days: form.days.includes(d) ? form.days.filter((x: number) => x !== d) : [...form.days, d] });
  const inputCls = cn('w-full border-b focus:outline-none py-2 transition-all', dm ? 'bg-transparent text-white border-[#2A2A2A] focus:border-[#7A5230]' : 'border-gray-100 focus:border-[#7A5230]');
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn('w-full max-w-lg rounded-3xl p-10 space-y-8 relative max-h-[90vh] overflow-y-auto', dm ? 'bg-[#1C1C1C] text-white' : 'bg-white')}>
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-inherit transition-colors"><X size={22} /></button>
        <div className="flex items-start justify-between pr-8">
          <div><h2 className="text-2xl font-light">{initial ? 'Edit Habit' : 'Plan the Habit'}</h2><p className="text-sm text-gray-400 mt-1">Consistency is the key to testing your hypothesis.</p></div>
          {!initial && (
            <button onClick={() => setShowTemplates(!showTemplates)} className={cn('text-xs font-mono uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all mt-1', showTemplates ? 'text-white border-transparent' : (dm ? 'border-[#2A2A2A] text-gray-400' : 'border-gray-200 text-gray-400'))} style={showTemplates ? { background: BRAND } : {}}>
              Templates
            </button>
          )}
        </div>

        {/* Template picker */}
        {showTemplates && !initial && (
          <div className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Pick a template — adds the first habit</p>
            <div className="grid grid-cols-2 gap-2">
              {HABIT_TEMPLATES.map(tmpl => (
                <button key={tmpl.label} onClick={() => {
                  const first = tmpl.habits[0];
                  setForm({ title: first.title, days: first.days, startTime: first.startTime, duration: first.duration, showInChecklist: first.showInChecklist });
                  setShowTemplates(false);
                }} className={cn('flex items-center gap-2 p-3 rounded-2xl border text-left transition-all text-sm', dm ? 'border-[#2A2A2A] hover:border-[#7A5230] bg-[#252525]' : 'border-gray-100 hover:border-[#7A5230] bg-gray-50')}>
                  <span className="text-lg">{tmpl.icon}</span>
                  <span className="font-medium text-xs">{tmpl.label}</span>
                </button>
              ))}
            </div>
            <div className={cn('h-px', dm ? 'bg-[#2A2A2A]' : 'bg-gray-100')} />
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-1"><label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Name</label>
            <input autoFocus type="text" placeholder="e.g. Morning Deep Work" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} /></div>
          <div className="space-y-2"><label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Schedule</label>
            <div className="flex gap-2">{['S','M','T','W','T','F','S'].map((d, i) => (
              <button key={i} onClick={() => toggle(i)} className={cn('w-10 h-10 rounded-full flex items-center justify-center text-xs font-mono transition-all', form.days.includes(i) ? 'text-white' : dm ? 'bg-[#2A2A2A] text-gray-400' : 'bg-gray-50 text-gray-400')} style={form.days.includes(i) ? { background: BRAND } : {}}>{d}</button>
            ))}</div>
          </div>
          <div className={cn('flex items-center justify-between p-4 rounded-2xl', dm ? 'bg-[#252525]' : 'bg-gray-50')}>
            <div><p className="text-sm font-medium">Show in Daily Checklist</p><p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Appear in today's task list</p></div>
            <button onClick={() => setForm({ ...form, showInChecklist: !form.showInChecklist })} className={cn('w-12 h-6 rounded-full transition-all relative', form.showInChecklist ? '' : 'bg-gray-200')} style={form.showInChecklist ? { background: BRAND } : {}}>
              <div className={cn('absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all', form.showInChecklist ? 'left-7' : 'left-1')} />
            </button>
          </div>
          {!isRating && <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1"><label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Start Time</label><input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} className={inputCls} /></div>
            <div className="space-y-1"><label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Duration (min)</label><input type="number" value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} className={inputCls} /></div>
          </div>}
        </div>
        <button disabled={!form.title} onClick={() => onSubmit(form)} style={{ background: BRAND }} className="w-full text-white py-4 rounded-full font-medium disabled:opacity-30 hover:opacity-90 transition-opacity">{initial ? 'Save Changes' : 'Add Habit'}</button>
      </motion.div>
    </div>
  );
}

function ReflectionModal({ text, setText, rating, setRating, isRatingType, onSave, duration, dm, targetHit }: any) {
  const MIN_CHARS = 10;
  const charCount = text.trim().length;
  const meetsMinimum = charCount >= MIN_CHARS;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={cn('w-full max-w-lg rounded-3xl p-10 space-y-8 text-center', dm ? 'bg-[#1C1C1C] text-white' : 'bg-white')}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: `${BRAND}20`, color: BRAND }}><CheckCircle2 size={38} /></div>
        <div>
          <h2 className="text-2xl font-light">Session Complete</h2>
          <p className="text-gray-400 mt-1">You tracked {Math.floor(duration / 60)}m {duration % 60}s total.</p>
          {targetHit && (
            <p className="text-emerald-500 text-sm font-medium mt-1 flex items-center gap-1.5 justify-center">
              <CheckCircle2 size={14} /> Target already recorded — only saving extra time & reflection
            </p>
          )}
        </div>
        <div className="space-y-5 text-left">
          {isRatingType && (
            <div className="space-y-3"><label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Performance Rating (1-10)</label>
              <div className="flex justify-between gap-1">
                {[1,2,3,4,5,6,7,8,9,10].map(r => (
                  <button key={r} onClick={() => setRating(r)} className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono transition-all', dm ? (rating === r ? 'text-white' : 'bg-[#252525] text-gray-400') : (rating === r ? 'text-white' : 'bg-gray-50 text-gray-400'))} style={rating === r ? { background: BRAND, transform: 'scale(1.1)' } : {}}>{r}</button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">What did you learn?</label>
              <span className={cn('text-[10px] font-mono tabular-nums', meetsMinimum ? 'text-emerald-500' : 'text-gray-400')}>
                {charCount}/{MIN_CHARS}
              </span>
            </div>
            <textarea autoFocus placeholder="Capture your insights... (at least 10 characters)" value={text} onChange={e => setText(e.target.value)} className={cn('w-full border-none rounded-2xl px-5 py-5 focus:ring-1 focus:outline-none min-h-[130px] resize-none', dm ? 'bg-[#252525] text-white placeholder-gray-600 focus:ring-[#7A5230]' : 'bg-gray-50 focus:ring-[#7A5230]')} />
            {!meetsMinimum && charCount > 0 && (
              <p className="text-[10px] text-amber-500 font-mono">Add a few more words — reflection is the core of your learning.</p>
            )}
          </div>
        </div>
        <button onClick={onSave} disabled={!meetsMinimum} style={{ background: BRAND }} className="w-full text-white py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-40">
          {meetsMinimum ? 'Save Reflection' : `${MIN_CHARS - charCount} more character${MIN_CHARS - charCount !== 1 ? 's' : ''} needed`}
        </button>
      </motion.div>
    </div>
  );
}

function UpgradeModal({ reason, onClose, dm }: { reason: string; onClose: () => void; dm: boolean }) {
  const features = [
    { free: '3 goals', pro: 'Unlimited goals' },
    { free: '5 habits / hypothesis', pro: 'Unlimited habits' },
    { free: 'Week analytics only', pro: 'Full analytics (month + year)' },
    { free: '—', pro: 'Habit journal & notes' },
    { free: '—', pro: 'Heatmap calendar' },
    { free: '—', pro: 'Cloud backup & multi-device sync' },
  ];
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end md:items-center justify-center p-4">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className={cn('w-full max-w-md rounded-3xl overflow-hidden shadow-2xl', dm ? 'bg-[#1C1C1C] text-white' : 'bg-white')}>
        {/* Header */}
        <div className="p-8 text-center space-y-2 relative" style={{ background: BRAND }}>
          <button onClick={onClose} className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors"><X size={19} /></button>
          <p className="text-white/70 text-xs font-mono uppercase tracking-widest">You've reached a limit</p>
          <h2 className="text-2xl font-light text-white">{reason}</h2>
          <p className="text-white/70 text-sm">Upgrade to Evolv Pro to unlock everything.</p>
        </div>
        {/* Feature comparison */}
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-400 pb-2 border-b" style={{ borderColor: dm ? '#2A2A2A' : '#F3F4F6' }}>
            <span>Feature</span><span className="text-center">Free</span><span className="text-center" style={{ color: BRAND }}>Pro</span>
          </div>
          {features.map((f, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 text-xs py-1">
              <span className={dm ? 'text-gray-300' : 'text-gray-600'}>{f.pro.replace('Unlimited ', '').replace(' goals', ' goals').split(' ')[0]}</span>
              <span className="text-center text-gray-400">{f.free}</span>
              <span className="text-center font-medium" style={{ color: BRAND }}>{f.pro}</span>
            </div>
          ))}
        </div>
        {/* CTA */}
        <div className="px-6 pb-8 space-y-3">
          <div className="text-center space-y-1">
            <p className="text-lg font-light">₱149<span className="text-sm text-gray-400">/mo</span> &nbsp;·&nbsp; ₱999<span className="text-sm text-gray-400">/yr</span></p>
          </div>
          <button style={{ background: BRAND }} className="w-full text-white py-4 rounded-full font-medium hover:opacity-90 transition-opacity">
            Upgrade to Pro — Coming Soon
          </button>
          <button onClick={onClose} className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors py-1">
            Continue with Free
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Account Modal
// ─────────────────────────────────────────────
function AccountModal({ email, onSave, onClose, dm }: { email: string; onSave: (e: string) => void; onClose: () => void; dm: boolean }) {
  const [input, setInput] = useState(email);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(input.trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  const handleRemove = () => {
    onSave('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-4">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className={cn('w-full max-w-md rounded-3xl p-8 space-y-6', dm ? 'bg-[#1C1C1C] text-white' : 'bg-white text-[#1A1A1A]')}>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-light">Account</h2>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              Your data is stored on this device. Register your email to reserve your account for cloud sync when it launches — no password needed yet.
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-inherit transition-colors ml-4 shrink-0"><X size={19} /></button>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Email Address</label>
          <input
            autoFocus
            type="email"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleSave(); }}
            placeholder="you@example.com"
            className={cn('w-full rounded-2xl px-5 py-4 text-sm border-none focus:ring-2 focus:outline-none transition-all', dm ? 'bg-[#252525] text-white placeholder-gray-600' : 'bg-gray-50 text-[#1A1A1A]')}
            style={{ '--tw-ring-color': BRAND } as any}
          />
        </div>

        {/* Benefits list */}
        <div className={cn('rounded-2xl p-4 space-y-2', dm ? 'bg-[#252525]' : 'bg-gray-50')}>
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-2">What you get</p>
          {[
            '📱 Cross-device sync (coming soon)',
            '☁️ Cloud backup — never lose your data',
            '🔔 Priority access to Evolv Pro features',
          ].map((item, i) => (
            <p key={i} className="text-xs text-gray-500">{item}</p>
          ))}
        </div>

        <div className="space-y-2">
          <button
            onClick={handleSave}
            disabled={!input.trim() || saved}
            style={{ background: BRAND }}
            className="w-full text-white py-3.5 rounded-full font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {saved ? '✓ Saved!' : email ? 'Update Email' : 'Save Email'}
          </button>
          {email && (
            <button onClick={handleRemove} className="w-full text-red-400 text-sm hover:text-red-500 transition-colors py-1">
              Remove email
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}


function ChangelogModal({ onClose, dm }: { onClose: () => void; dm: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-6">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className={cn('w-full max-w-lg rounded-3xl p-8 space-y-8 max-h-[75vh] overflow-y-auto', dm ? 'bg-[#1C1C1C] text-white' : 'bg-white')}>
        <div className="flex items-start justify-between">
          <div><h2 className="text-xl font-light">What's New</h2><p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mt-1">Evolv v{APP_VERSION}</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-inherit transition-colors"><X size={19} /></button>
        </div>
        {CHANGELOG.map(rel => (
          <div key={rel.version} className="space-y-3">
            <div className="flex items-center gap-2"><span className="px-3 py-1 rounded-full text-white text-xs font-mono" style={{ background: BRAND }}>v{rel.version}</span><span className="text-xs text-gray-400">{rel.date}</span></div>
            <ul className="space-y-2">{rel.changes.map((c, i) => <li key={i} className="flex items-start gap-2 text-sm text-gray-500"><Check size={13} style={{ color: BRAND, marginTop: 2, flexShrink: 0 }} />{c}</li>)}</ul>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
