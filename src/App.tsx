import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Target, 
  AlertCircle, 
  Lightbulb, 
  Calendar, 
  LayoutDashboard, 
  BarChart3, 
  ChevronRight, 
  ArrowLeft,
  Timer,
  CheckCircle2,
  Check,
  Trash2,
  Clock,
  X,
  Play,
  Square,
  History,
  Download
} from 'lucide-react';
import { 
  format, 
  parseISO, 
  isSameDay, 
  addDays, 
  subDays, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  eachMonthOfInterval,
  isWithinInterval,
  isSameMonth,
  isSameYear,
  isSameWeek
} from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  ComposedChart,
  Line
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Goal, Problem, Hypothesis, Habit, HabitLog, AppScreen, GoalType, StandaloneTask } from './types';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Local Storage Keys
const STORAGE_KEY = 'evolv_data';

export default function App() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [standaloneTasks, setStandaloneTasks] = useState<StandaloneTask[]>([]);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('dashboard');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedProblemId, setSelectedProblemId] = useState<string | null>(null);
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string | null>(null);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [activeHabitId, setActiveHabitId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [rating, setRating] = useState<number>(5);

  // Load data from local storage
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed)) {
          setGoals(parsed);
        } else {
          setGoals(parsed.goals || []);
          setStandaloneTasks(parsed.standaloneTasks || []);
        }
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    }
  }, []);

  // Save data to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ goals, standaloneTasks }));
  }, [goals, standaloneTasks]);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (isTimerRunning && !isTimerPaused) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isTimerPaused]);

  // Navigation helpers
  const navigateTo = (screen: AppScreen, goalId?: string, problemId?: string, hypothesisId?: string) => {
    setCurrentScreen(screen);
    if (goalId !== undefined) setSelectedGoalId(goalId);
    if (problemId !== undefined) setSelectedProblemId(problemId);
    if (hypothesisId !== undefined) setSelectedHypothesisId(hypothesisId);
  };

  const goBack = () => {
    if (currentScreen === 'goal-detail') navigateTo('dashboard');
    else if (currentScreen === 'problem-detail') navigateTo('goal-detail', selectedGoalId!);
    else if (currentScreen === 'hypothesis-detail') navigateTo('problem-detail', selectedGoalId!, selectedProblemId!);
    else navigateTo('dashboard');
  };

  // Data helpers
  const selectedGoal = goals.find(g => g.id === selectedGoalId);
  const selectedProblem = selectedGoal?.problems.find(p => p.id === selectedProblemId);
  const selectedHypothesis = selectedProblem?.hypotheses.find(h => h.id === selectedHypothesisId);

  const addGoal = (newGoal: Omit<Goal, 'id' | 'problems' | 'createdAt' | 'progress'>) => {
    const goal: Goal = {
      ...newGoal,
      id: crypto.randomUUID(),
      problems: [],
      createdAt: new Date().toISOString(),
      progress: 0
    };
    setGoals([...goals, goal]);
    setIsAddingGoal(false);
  };

  const addProblem = (goalId: string, description: string) => {
    setGoals(goals.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          problems: [...g.problems, { id: crypto.randomUUID(), description, hypotheses: [] }]
        };
      }
      return g;
    }));
  };

  const addHypothesis = (goalId: string, problemId: string, description: string) => {
    setGoals(goals.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          problems: g.problems.map(p => {
            if (p.id === problemId) {
              return {
                ...p,
                hypotheses: [...p.hypotheses, { id: crypto.randomUUID(), description, habits: [], testCount: 0 }]
              };
            }
            return p;
          })
        };
      }
      return g;
    }));
  };

  const addHabit = (goalId: string, problemId: string, hypothesisId: string, habit: Omit<Habit, 'id' | 'logs'>) => {
    setGoals(goals.map(g => {
      if (g.id === goalId) {
        return {
          ...g,
          problems: g.problems.map(p => {
            if (p.id === problemId) {
              return {
                ...p,
                hypotheses: p.hypotheses.map(h => {
                  if (h.id === hypothesisId) {
                    return {
                      ...h,
                      habits: [...h.habits, { ...habit, id: crypto.randomUUID(), logs: [] }]
                    };
                  }
                  return h;
                })
              };
            }
            return p;
          })
        };
      }
      return g;
    }));
  };

  const addStandaloneTask = (title: string) => {
    const newTask: StandaloneTask = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      date: new Date().toISOString()
    };
    setStandaloneTasks([...standaloneTasks, newTask]);
  };

  const toggleStandaloneTask = (id: string) => {
    setStandaloneTasks(standaloneTasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const deleteStandaloneTask = (id: string) => {
    setStandaloneTasks(standaloneTasks.filter(t => t.id !== id));
  };

  const logHabit = (habitId: string, durationMinutes: number, reflection: string, habitRating?: number) => {
    setGoals(goals.map(g => {
      let updatedGoal = { ...g };
      let logsCount = 0;
      let totalLogsNeeded = 0;

      updatedGoal.problems = g.problems.map(p => ({
        ...p,
        hypotheses: p.hypotheses.map(h => ({
          ...h,
          habits: h.habits.map(hab => {
            totalLogsNeeded += 1;
            if (hab.id === habitId) {
              const newLog: HabitLog = {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                durationPerformed: durationMinutes,
                reflection,
                rating: habitRating
              };
              const updatedHabit = { ...hab, logs: [...hab.logs, newLog] };
              if (updatedHabit.logs.length > 0) logsCount += 1;
              return updatedHabit;
            }
            if (hab.logs.length > 0) logsCount += 1;
            return hab;
          })
        }))
      }));

      // Simple progress calculation
      if (totalLogsNeeded > 0) {
        updatedGoal.progress = Math.min(Math.round((logsCount / totalLogsNeeded) * 100), 100);
      }

      return updatedGoal;
    }));
  };

  // Computed values for Dashboard
  const todayHabits = useMemo(() => {
    const today = new Date().getDay();
    const habits: { habit: Habit; goal: Goal; hypothesis: Hypothesis }[] = [];
    goals.forEach(g => {
      g.problems.forEach(p => {
        p.hypotheses.forEach(h => {
          h.habits.forEach(hab => {
            if (hab.days.includes(today)) {
              habits.push({ habit: hab, goal: g, hypothesis: h });
            }
          });
        });
      });
    });
    return habits;
  }, [goals]);

  const startTimer = (habitId: string) => {
    setActiveHabitId(habitId);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    setIsTimerPaused(false);
  };

  const togglePause = () => {
    setIsTimerPaused(!isTimerPaused);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
    setIsTimerPaused(false);
    setShowReflection(true);
  };

  const completeChecklistHabit = (habitId: string) => {
    setActiveHabitId(habitId);
    setTimerSeconds(0); // For checklist, duration is 0 or we could ask for it, but user said "don't have to Start the timer"
    setShowReflection(true);
  };

  const saveReflection = () => {
    if (activeHabitId) {
      const habitInfo = todayHabits.find(h => h.habit.id === activeHabitId);
      const isRatingType = habitInfo?.goal.type === 'rating';
      logHabit(activeHabitId, isRatingType ? 0 : Math.floor(timerSeconds / 60), reflectionText, isRatingType ? rating : undefined);
    }
    setShowReflection(false);
    setReflectionText('');
    setRating(5);
    setActiveHabitId(null);
    setTimerSeconds(0);
  };

  const exportData = () => {
    const csvRows = [
      ['Goal', 'Goal Type', 'Problem', 'Hypothesis', 'Habit', 'Date', 'Duration (min)', 'Rating (1-10)', 'Reflection']
    ];
    goals.forEach(g => {
      g.problems.forEach(p => {
        p.hypotheses.forEach(h => {
          h.habits.forEach(hab => {
            hab.logs.forEach(log => {
              csvRows.push([
                g.title,
                g.type,
                p.description,
                h.description,
                hab.title,
                format(parseISO(log.date), 'yyyy-MM-dd HH:mm'),
                log.durationPerformed.toString(),
                log.rating?.toString() || '',
                log.reflection.replace(/"/g, '""')
              ]);
            });
          });
        });
      });
    });
    const csvContent = csvRows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "evolv_progress.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#EBEBE9] text-[#1A1A1A] font-sans selection:bg-[#E5E5E5]">
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:w-20 bg-white border-t md:border-t-0 md:border-r border-gray-100 z-50 flex md:flex-col items-center justify-around md:justify-center gap-8 py-4 md:py-8">
        <NavItem icon={<LayoutDashboard size={24} />} active={currentScreen === 'dashboard'} onClick={() => navigateTo('dashboard')} label="Home" />
        <NavItem icon={<Target size={24} />} active={currentScreen === 'goals' || currentScreen === 'goal-detail'} onClick={() => navigateTo('goals')} label="Goals" />
        <NavItem icon={<BarChart3 size={24} />} active={currentScreen === 'analytics'} onClick={() => navigateTo('analytics')} label="Stats" />
      </nav>

      {/* Main Content */}
      <main className="pb-24 md:pb-8 md:pl-20 max-w-5xl mx-auto px-6 pt-8">
        <AnimatePresence mode="wait">
          {currentScreen === 'dashboard' && (
            <Dashboard 
              todayHabits={todayHabits} 
              standaloneTasks={standaloneTasks}
              onToggleTask={toggleStandaloneTask}
              onDeleteTask={deleteStandaloneTask}
              onAddTask={addStandaloneTask}
              activeHabitId={activeHabitId}
              timerSeconds={timerSeconds}
              isTimerRunning={isTimerRunning}
              isTimerPaused={isTimerPaused}
              startTimer={startTimer}
              togglePause={togglePause}
              stopTimer={stopTimer}
              onCompleteChecklist={completeChecklistHabit}
              onAddGoal={() => navigateTo('goals')}
            />
          )}

          {currentScreen === 'goals' && (
            <GoalsList 
              goals={goals} 
              onSelectGoal={(id: string) => navigateTo('goal-detail', id)}
              onAddGoal={() => setIsAddingGoal(true)}
            />
          )}

          {currentScreen === 'goal-detail' && selectedGoal && (
            <GoalDetail 
              goal={selectedGoal} 
              onBack={goBack}
              onAddProblem={(desc: string) => addProblem(selectedGoal.id, desc)}
              onSelectProblem={(pid: string) => navigateTo('problem-detail', selectedGoal.id, pid)}
            />
          )}

          {currentScreen === 'problem-detail' && selectedGoal && selectedProblem && (
            <ProblemDetail 
              goal={selectedGoal}
              problem={selectedProblem}
              onBack={goBack}
              onAddHypothesis={(desc: string) => addHypothesis(selectedGoal.id, selectedProblem.id, desc)}
              onSelectHypothesis={(hid: string) => navigateTo('hypothesis-detail', selectedGoal.id, selectedProblem.id, hid)}
            />
          )}

          {currentScreen === 'hypothesis-detail' && selectedGoal && selectedProblem && selectedHypothesis && (
            <HypothesisDetail 
              goal={selectedGoal}
              problem={selectedProblem}
              hypothesis={selectedHypothesis}
              onBack={goBack}
              onAddHabit={(habit: any) => addHabit(selectedGoal.id, selectedProblem.id, selectedHypothesis.id, habit)}
              goalType={selectedGoal.type}
            />
          )}

          {currentScreen === 'analytics' && (
            <Analytics goals={goals} onExport={exportData} />
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isAddingGoal && (
          <GoalFormModal 
            onClose={() => setIsAddingGoal(false)} 
            onSubmit={addGoal} 
          />
        )}

        {showReflection && (
          <ReflectionModal 
            text={reflectionText}
            setText={setReflectionText}
            rating={rating}
            setRating={setRating}
            isRatingType={todayHabits.find(h => h.habit.id === activeHabitId)?.goal.type === 'rating'}
            onSave={saveReflection}
            duration={timerSeconds}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub-components ---

function NavItem({ icon, active, onClick, label }: { icon: React.ReactNode, active: boolean, onClick: () => void, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-300",
        active ? "text-[#1A1A1A] scale-110" : "text-gray-400 hover:text-gray-600"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
  );
}

function Dashboard({ todayHabits, standaloneTasks, onToggleTask, onDeleteTask, onAddTask, activeHabitId, timerSeconds, isTimerRunning, isTimerPaused, startTimer, togglePause, stopTimer, onCompleteChecklist }: any) {
  const timedHabits = todayHabits.filter((h: any) => h.goal.type === 'time');
  const checklistHabits = todayHabits.filter((h: any) => h.habit.showInChecklist);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const todayStandalone = standaloneTasks.filter((t: any) => isSameDay(parseISO(t.date), new Date()));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12"
    >
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-light tracking-tight">Daily Command Center</h1>
          <p className="text-gray-500 font-serif italic">{format(new Date(), 'EEEE, MMMM do')}</p>
        </div>
        <button 
          onClick={() => setIsAddingTask(true)}
          className="flex items-center gap-2 bg-white border border-gray-200 text-[#1A1A1A] px-6 py-3 rounded-full text-sm font-medium hover:border-[#1A1A1A] transition-all"
        >
          <Plus size={18} /> New Task
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-12">
          {/* Timed Habits Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">Timed Habits</h2>
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{timedHabits.length} Scheduled</span>
            </div>

            {timedHabits.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <p className="text-gray-400 text-sm italic">No timed habits for today.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {timedHabits.map(({ habit, goal, hypothesis }: any) => {
                  // Calculate adjusted daily target for catch-up
                  const end = parseISO(goal.deadline);
                  const now = new Date();
                  const daysRemaining = Math.max(1, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
                  
                  let totalActual = 0;
                  goal.problems.forEach((p: any) => {
                    p.hypotheses.forEach((h: any) => {
                      h.habits.forEach((hab: any) => {
                        hab.logs.forEach((log: any) => {
                          totalActual += log.durationPerformed;
                        });
                      });
                    });
                  });

                  const remaining = goal.targetValue - totalActual;
                  const adjustedTarget = Math.max(0, Math.round(remaining / daysRemaining));

                  return (
                    <HabitCard 
                      key={habit.id} 
                      habit={habit} 
                      goal={goal} 
                      hypothesis={hypothesis}
                      isActive={activeHabitId === habit.id}
                      isTimerRunning={isTimerRunning}
                      isTimerPaused={isTimerPaused}
                      timerSeconds={timerSeconds}
                      onStart={() => startTimer(habit.id)}
                      onPause={togglePause}
                      onStop={stopTimer}
                      mode="timer"
                      adjustedTarget={adjustedTarget}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Daily Checklist Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium">Daily Checklist</h2>
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{checklistHabits.length + todayStandalone.length} Tasks</span>
            </div>

            {(checklistHabits.length === 0 && todayStandalone.length === 0) ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <p className="text-gray-400 text-sm italic">No checklist tasks for today.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden divide-y divide-gray-50">
                {checklistHabits.map(({ habit, goal }: any) => {
                  const isCompleted = habit.logs.some((l: any) => isSameDay(parseISO(l.date), new Date()));
                  return (
                    <div key={habit.id} className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => !isCompleted && onCompleteChecklist(habit.id)}
                          className={cn(
                            "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                            isCompleted ? "bg-[#1A1A1A] border-[#1A1A1A]" : "border-gray-200 group-hover:border-[#1A1A1A]"
                          )}
                        >
                          {isCompleted && <Check size={14} className="text-white" />}
                        </button>
                        <div className="space-y-0.5">
                          <p className={cn("font-medium", isCompleted && "line-through text-gray-400")}>{habit.title}</p>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: goal.color }} />
                            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">{goal.title}</span>
                          </div>
                        </div>
                      </div>
                      {!isCompleted && (
                        <button 
                          onClick={() => onCompleteChecklist(habit.id)}
                          className="text-xs font-medium text-gray-400 hover:text-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-all"
                        >
                          Complete & Rate
                        </button>
                      )}
                    </div>
                  );
                })}
                {todayStandalone.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => onToggleTask(task.id)}
                        className={cn(
                          "w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                          task.completed ? "bg-[#1A1A1A] border-[#1A1A1A]" : "border-gray-200 group-hover:border-[#1A1A1A]"
                        )}
                      >
                        {task.completed && <Check size={14} className="text-white" />}
                      </button>
                      <p className={cn("font-medium", task.completed && "line-through text-gray-400")}>{task.title}</p>
                    </div>
                    <button 
                      onClick={() => onDeleteTask(task.id)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-6">
            <h3 className="text-sm font-mono uppercase tracking-widest text-gray-400">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-2xl font-light">12</p>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Day Streak</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-light">
                  {Math.round(((checklistHabits.filter((h: any) => h.habit.logs.some((l: any) => isSameDay(parseISO(l.date), new Date()))).length + todayStandalone.filter((t: any) => t.completed).length) / (checklistHabits.length + todayStandalone.length || 1)) * 100)}%
                </p>
                <p className="text-[10px] uppercase tracking-wider text-gray-400">Completion</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1A1A1A] text-white rounded-2xl p-6 space-y-4">
            <p className="text-sm font-serif italic opacity-70">"The secret of getting ahead is getting started."</p>
            <p className="text-[10px] uppercase tracking-widest font-mono opacity-50">— Mark Twain</p>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {isAddingTask && (
          <TaskFormModal 
            onClose={() => setIsAddingTask(false)}
            onSubmit={(title: string) => {
              onAddTask(title);
              setIsAddingTask(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HabitCard({ habit, goal, isActive, isTimerPaused, timerSeconds, onStart, onPause, onStop, onComplete, mode = 'timer', adjustedTarget }: any) {
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isChecklist = mode === 'checklist';
  const showAdjusted = adjustedTarget && adjustedTarget > habit.duration;

  return (
    <div className={cn(
      "group relative bg-white border rounded-2xl p-6 transition-all duration-500",
      isActive ? "border-[#1A1A1A] ring-1 ring-[#1A1A1A] shadow-xl scale-[1.02]" : "border-gray-100 hover:border-gray-200"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: goal.color }} />
            <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">{goal.title}</span>
          </div>
          <h3 className="text-lg font-medium">{habit.title}</h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {!isChecklist && <span className="flex items-center gap-1"><Clock size={12} /> {habit.startTime}</span>}
            {!isChecklist && (
              <span className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors",
                showAdjusted ? "bg-amber-50 text-amber-700 border border-amber-100" : "text-gray-500"
              )}>
                <Timer size={12} /> 
                {showAdjusted ? (
                  <>
                    <span className="line-through opacity-50">{habit.duration}m</span>
                    <span className="font-bold">{adjustedTarget}m</span>
                    <span className="text-[8px] uppercase tracking-tighter">Catch-up</span>
                  </>
                ) : (
                  `${habit.duration}m`
                )}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-gray-50 text-[10px] font-mono uppercase tracking-widest">{goal.type}</span>
            {isChecklist && <span className="flex items-center gap-1 text-gray-400 italic">Daily Goal</span>}
          </div>
        </div>

        <div className="flex flex-col items-end gap-4">
          {isChecklist ? (
            <button 
              onClick={onComplete}
              className="px-6 py-2 border border-[#1A1A1A] text-[#1A1A1A] rounded-full text-sm font-medium hover:bg-[#1A1A1A] hover:text-white transition-all"
            >
              Complete & Rate
            </button>
          ) : (
            isActive ? (
              <div className="flex items-center gap-3">
                <span className="text-2xl font-mono tabular-nums">{formatTime(timerSeconds)}</span>
                <div className="flex gap-2">
                  <button 
                    onClick={onPause}
                    className="w-10 h-10 bg-gray-100 text-[#1A1A1A] rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    {isTimerPaused ? <Play size={16} fill="currentColor" /> : <div className="flex gap-1"><div className="w-1 h-4 bg-current" /><div className="w-1 h-4 bg-current" /></div>}
                  </button>
                  <button 
                    onClick={onStop}
                    className="w-10 h-10 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Square size={16} fill="currentColor" />
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={onStart}
                className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-[#1A1A1A] transition-all"
              >
                <Play size={16} className="ml-0.5" />
              </button>
            )
          )}
        </div>
      </div>
      
      {!isChecklist && isActive && (
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((timerSeconds / (habit.duration * 60)) * 100, 100)}%` }}
          className="absolute bottom-0 left-0 h-1 bg-[#1A1A1A] rounded-b-2xl"
        />
      )}
    </div>
  );
}

function GoalsList({ goals, onSelectGoal, onAddGoal }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-12"
    >
      <header className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-light tracking-tight">Your Goals</h1>
          <p className="text-gray-500 font-serif italic">The foundation of your evolution.</p>
        </div>
        <button 
          onClick={onAddGoal}
          className="flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 rounded-full text-sm font-medium hover:scale-105 transition-transform"
        >
          <Plus size={18} /> New Goal
        </button>
      </header>

      {goals.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-20 text-center space-y-6">
          <Target className="mx-auto text-gray-200" size={64} />
          <div className="space-y-2">
            <h3 className="text-xl font-medium">No goals yet</h3>
            <p className="text-gray-500 max-w-xs mx-auto">Start by defining what you want to achieve. Be specific, be bold.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal: Goal) => (
            <button 
              key={goal.id}
              onClick={() => onSelectGoal(goal.id)}
              className="group bg-white border border-gray-100 rounded-2xl p-8 text-left hover:border-[#1A1A1A] hover:shadow-xl transition-all duration-500"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest bg-gray-50 text-gray-500">
                    Target: {goal.targetValue} {goal.targetUnit}
                  </span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[#1A1A1A] group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-2xl font-light leading-tight">{goal.title}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-gray-400">
                    <span>Progress</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-1000" 
                      style={{ width: `${goal.progress}%`, background: goal.color }} 
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><AlertCircle size={12} /> {goal.problems.length} Problems</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> Due {format(parseISO(goal.deadline), 'MMM d')}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function GoalDetail({ goal, onBack, onAddProblem, onSelectProblem }: any) {
  const [newProblem, setNewProblem] = useState('');

  // Calculate progress metrics
  const metrics = useMemo(() => {
    const start = parseISO(goal.createdAt);
    const end = parseISO(goal.deadline);
    const now = new Date();
    
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const daysElapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate total actual progress from all habit logs
    let totalActual = 0;
    goal.problems.forEach((p: any) => {
      p.hypotheses.forEach((h: any) => {
        h.habits.forEach((hab: any) => {
          hab.logs.forEach((log: any) => {
            totalActual += log.durationPerformed;
          });
        });
      });
    });

    // For 'time' goals, targetValue is usually in minutes or hours. 
    // Let's assume minutes for calculation if it's time-based.
    const target = goal.targetValue; 
    const linearTarget = (target / totalDays) * Math.min(daysElapsed, totalDays);
    const deficit = linearTarget - totalActual;
    const adjustedDaily = daysRemaining > 0 ? (target - totalActual) / daysRemaining : 0;
    const originalDaily = target / totalDays;

    return {
      totalActual,
      linearTarget,
      deficit,
      adjustedDaily,
      originalDaily,
      daysRemaining,
      percentComplete: (totalActual / target) * 100,
      linearPercent: (linearTarget / target) * 100
    };
  }, [goal]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-12"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#1A1A1A] transition-colors">
        <ArrowLeft size={18} /> Back to Goals
      </button>

      <header className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full" style={{ background: goal.color }} />
            <h1 className="text-4xl font-light tracking-tight">{goal.title}</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Deadline</p>
            <p className="font-medium">{format(parseISO(goal.deadline), 'MMM do, yyyy')}</p>
          </div>
        </div>

        {/* Progress Visualization */}
        <div className="space-y-4 bg-gray-50 p-8 rounded-3xl border border-gray-100">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Current Progress</p>
              <p className="text-3xl font-light">{Math.round(metrics.totalActual)} <span className="text-sm text-gray-400">/ {goal.targetValue} {goal.targetUnit}</span></p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Pace Status</p>
              <p className={cn(
                "text-sm font-medium",
                metrics.deficit > 0 ? "text-red-500" : "text-green-500"
              )}>
                {metrics.deficit > 0 
                  ? `Behind by ${Math.round(metrics.deficit)} ${goal.targetUnit}` 
                  : `Ahead by ${Math.round(Math.abs(metrics.deficit))} ${goal.targetUnit}`}
              </p>
            </div>
          </div>

          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            {/* Linear Target Marker */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, metrics.linearPercent)}%` }}
              className="absolute top-0 left-0 h-full bg-gray-300 opacity-50 z-0"
            />
            {/* Actual Progress */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, metrics.percentComplete)}%` }}
              className="absolute top-0 left-0 h-full z-10"
              style={{ background: goal.color }}
            />
          </div>
          
          <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-gray-400">
            <span>Start</span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-300 opacity-50 rounded-full" /> Expected Pace
            </span>
            <span>Target</span>
          </div>
        </div>

        {/* Catch-up Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-100 p-6 rounded-2xl space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Days Remaining</p>
            <p className="text-2xl font-light">{metrics.daysRemaining}</p>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-2xl space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Original Daily Goal</p>
            <p className="text-2xl font-light">{Math.round(metrics.originalDaily)} <span className="text-xs text-gray-400">{goal.targetUnit}/day</span></p>
          </div>
          <div className="bg-white border border-gray-100 p-6 rounded-2xl border-l-4 border-l-[#1A1A1A] space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#1A1A1A]">Adjusted Daily Target</p>
            <p className="text-2xl font-medium">{Math.max(0, Math.round(metrics.adjustedDaily))} <span className="text-xs text-gray-400">{goal.targetUnit}/day</span></p>
            <p className="text-[10px] text-gray-400 italic">Required to catch up by deadline</p>
          </div>
        </div>
      </header>

      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Obstacles & Problems</h2>
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{goal.problems.length} Identified</span>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="What's standing in your way?"
              value={newProblem}
              onChange={(e) => setNewProblem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newProblem) {
                  onAddProblem(newProblem);
                  setNewProblem('');
                }
              }}
              className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-[#1A1A1A] transition-all"
            />
            <button 
              onClick={() => {
                if (newProblem) {
                  onAddProblem(newProblem);
                  setNewProblem('');
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#1A1A1A] text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {goal.problems.map((problem: Problem) => (
              <button 
                key={problem.id}
                onClick={() => onSelectProblem(problem.id)}
                className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-6 hover:border-[#1A1A1A] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                    <AlertCircle size={20} />
                  </div>
                  <span className="font-medium">{problem.description}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400 font-mono uppercase tracking-widest">{problem.hypotheses.length} Hypotheses</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[#1A1A1A] group-hover:translate-x-1 transition-all" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function ProblemDetail({ goal, problem, onBack, onAddHypothesis, onSelectHypothesis }: any) {
  const [newHypothesis, setNewHypothesis] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-12"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#1A1A1A] transition-colors">
        <ArrowLeft size={18} /> Back to Goal
      </button>

      <header className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-400">
          <Target size={10} /> {goal.title}
        </div>
        <h1 className="text-3xl font-light tracking-tight flex items-center gap-4">
          <span className="text-red-500"><AlertCircle size={32} /></span>
          {problem.description}
        </h1>
      </header>

      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Hypothesis Builder</h2>
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">Experiments to solve</span>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <textarea 
              placeholder="If I [do this action], then [this problem will be solved]..."
              value={newHypothesis}
              onChange={(e) => setNewHypothesis(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-2xl px-6 py-6 focus:outline-none focus:border-[#1A1A1A] transition-all min-h-[120px] resize-none"
            />
            <button 
              onClick={() => {
                if (newHypothesis) {
                  onAddHypothesis(newHypothesis);
                  setNewHypothesis('');
                }
              }}
              className="absolute right-4 bottom-4 bg-[#1A1A1A] text-white px-6 py-2 rounded-full text-sm font-medium hover:scale-105 transition-transform"
            >
              Add Hypothesis
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {problem.hypotheses.map((hyp: Hypothesis, idx: number) => (
              <button 
                key={hyp.id}
                onClick={() => onSelectHypothesis(hyp.id)}
                className="group bg-white border border-gray-100 rounded-2xl p-8 text-left hover:border-[#1A1A1A] transition-all space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Experiment #{idx + 1}</span>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-[#1A1A1A] group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-lg font-serif italic leading-relaxed">"{hyp.description}"</p>
                <div className="flex items-center gap-4 pt-4 border-t border-gray-50">
                  <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={12} /> {hyp.habits.length} Habits</span>
                  <span className="text-xs text-gray-400 flex items-center gap-1"><History size={12} /> {hyp.testCount} Tests</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function HypothesisDetail({ goal, problem, hypothesis, onBack, onAddHabit, goalType }: any) {
  const [isAddingHabit, setIsAddingHabit] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-12"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-[#1A1A1A] transition-colors">
        <ArrowLeft size={18} /> Back to Problem
      </button>

      <header className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-400">
          <AlertCircle size={10} /> {problem.description}
        </div>
        <h1 className="text-3xl font-light tracking-tight flex items-center gap-4">
          <span className="text-amber-500"><Lightbulb size={32} /></span>
          {hypothesis.description}
        </h1>
      </header>

      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Habit Planner</h2>
          <button 
            onClick={() => setIsAddingHabit(true)}
            className="text-sm font-medium underline underline-offset-4"
          >
            Add New Habit
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {hypothesis.habits.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center space-y-4">
              <Calendar className="mx-auto text-gray-200" size={48} />
              <p className="text-gray-500">No habits tied to this hypothesis yet.</p>
              <button 
                onClick={() => setIsAddingHabit(true)}
                className="bg-[#1A1A1A] text-white px-6 py-2 rounded-full text-sm font-medium"
              >
                Create First Habit
              </button>
            </div>
          ) : (
            hypothesis.habits.map((habit: Habit) => (
              <div key={habit.id} className="bg-white border border-gray-100 rounded-2xl p-6 flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="font-medium">{habit.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    {goalType === 'time' && <span className="flex items-center gap-1"><Clock size={12} /> {habit.startTime}</span>}
                    {goalType === 'time' && <span className="flex items-center gap-1"><Timer size={12} /> {habit.duration}m</span>}
                    <span className="flex items-center gap-1"><Calendar size={12} /> {habit.days.length} days/week</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <span 
                      key={i} 
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono",
                        habit.days.includes(i) ? "bg-[#1A1A1A] text-white" : "bg-gray-50 text-gray-300"
                      )}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <AnimatePresence>
        {isAddingHabit && (
          <HabitFormModal 
            onClose={() => setIsAddingHabit(false)}
            onSubmit={(habit: any) => {
              onAddHabit(habit);
              setIsAddingHabit(false);
            }}
            goalType={goalType}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Analytics({ goals, onExport }: any) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const now = new Date();

  const stats = useMemo(() => {
    const data: any[] = [];
    
    if (timeRange === 'day') {
      const today = new Date();
      let cumulativeDebt = 0;
      
      goals.forEach((g: Goal) => {
        g.problems.forEach(p => {
          p.hypotheses.forEach(h => {
            h.habits.forEach(hab => {
              if (hab.days.includes(today.getDay())) {
                let actual = 0;
                let totalRating = 0;
                let ratingCount = 0;

                hab.logs.forEach(log => {
                  if (isSameDay(parseISO(log.date), today)) {
                    actual += log.durationPerformed;
                    if (log.rating) {
                      totalRating += log.rating;
                      ratingCount += 1;
                    }
                  }
                });

                const deficit = Math.max(0, hab.duration - actual);
                cumulativeDebt += (hab.duration - actual);

                data.push({ 
                  name: hab.title, 
                  actual, 
                  target: hab.duration,
                  deficit,
                  cumulativeDebt,
                  avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0
                });
              }
            });
          });
        });
      });
    } else if (timeRange === 'week') {
      const start = startOfWeek(now);
      const end = endOfWeek(now);
      const days = eachDayOfInterval({ start, end });
      let cumulativeDebt = 0;

      days.forEach(day => {
        let actual = 0;
        let target = 0;
        let totalRating = 0;
        let ratingCount = 0;

        goals.forEach((g: Goal) => {
          g.problems.forEach(p => {
            p.hypotheses.forEach(h => {
              h.habits.forEach(hab => {
                if (hab.days.includes(day.getDay())) {
                  target += hab.duration;
                }
                hab.logs.forEach(log => {
                  if (isSameDay(parseISO(log.date), day)) {
                    actual += log.durationPerformed;
                    if (log.rating) {
                      totalRating += log.rating;
                      ratingCount += 1;
                    }
                  }
                });
              });
            });
          });
        });

        const dailyDeficit = Math.max(0, target - actual);
        cumulativeDebt += (target - actual);

        data.push({ 
          name: format(day, 'EEE'), 
          actual, 
          target,
          deficit: dailyDeficit,
          cumulativeDebt,
          avgRating: ratingCount > 0 ? (totalRating / ratingCount).toFixed(1) : 0
        });
      });
    } else if (timeRange === 'month') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const weeks = eachWeekOfInterval({ start, end });
      let cumulativeDebt = 0;

      weeks.forEach((weekStart, idx) => {
        let actual = 0;
        let target = 0;
        const weekEnd = endOfWeek(weekStart);

        goals.forEach((g: Goal) => {
          g.problems.forEach(p => {
            p.hypotheses.forEach(h => {
              h.habits.forEach(hab => {
                // Approximate target for the week
                hab.days.forEach(d => {
                  // This is a bit complex to be precise, let's simplify:
                  // For each day in the week interval, if it's in hab.days, add target
                  const intervalDays = eachDayOfInterval({ 
                    start: weekStart < start ? start : weekStart, 
                    end: weekEnd > end ? end : weekEnd 
                  });
                  intervalDays.forEach(id => {
                    if (hab.days.includes(id.getDay())) {
                      target += hab.duration;
                    }
                  });
                });

                hab.logs.forEach(log => {
                  const logDate = parseISO(log.date);
                  if (isWithinInterval(logDate, { start: weekStart, end: weekEnd }) && isSameMonth(logDate, now)) {
                    actual += log.durationPerformed;
                  }
                });
              });
            });
          });
        });

        const deficit = Math.max(0, target - actual);
        cumulativeDebt += (target - actual);

        data.push({ 
          name: `W${idx + 1}`, 
          actual, 
          target,
          deficit,
          cumulativeDebt
        });
      });
    } else if (timeRange === 'year') {
      const months = eachMonthOfInterval({ start: startOfYear(now), end: endOfYear(now) });
      let cumulativeDebt = 0;

      months.forEach(month => {
        let actual = 0;
        let target = 0;

        goals.forEach((g: Goal) => {
          g.problems.forEach(p => {
            p.hypotheses.forEach(h => {
              h.habits.forEach(hab => {
                // Target for the month
                const daysInMonth = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
                daysInMonth.forEach(id => {
                  if (hab.days.includes(id.getDay())) {
                    target += hab.duration;
                  }
                });

                hab.logs.forEach(log => {
                  if (isSameMonth(parseISO(log.date), month) && isSameYear(parseISO(log.date), now)) {
                    actual += log.durationPerformed;
                  }
                });
              });
            });
          });
        });

        const deficit = Math.max(0, target - actual);
        cumulativeDebt += (target - actual);

        data.push({ 
          name: format(month, 'MMM'), 
          actual, 
          target,
          deficit,
          cumulativeDebt
        });
      });
    }
    return data;
  }, [goals, timeRange]);

  const dailyRecords = useMemo(() => {
    const records: any[] = [];
    goals.forEach((g: Goal) => {
      g.problems.forEach(p => {
        p.hypotheses.forEach(h => {
          h.habits.forEach(hab => {
            hab.logs.forEach(log => {
              const logDate = parseISO(log.date);
              let include = false;
              if (timeRange === 'day' && isSameDay(logDate, now)) include = true;
              else if (timeRange === 'week' && isSameWeek(logDate, now)) include = true;
              else if (timeRange === 'month' && isSameMonth(logDate, now)) include = true;
              else if (timeRange === 'year' && isSameYear(logDate, now)) include = true;

              if (include) {
                records.push({
                  id: log.id,
                  date: log.date,
                  habitTitle: hab.title,
                  goalTitle: g.title,
                  duration: log.durationPerformed,
                  target: hab.duration,
                  rating: log.rating,
                  reflection: log.reflection,
                  color: g.color
                });
              }
            });
          });
        });
      });
    });
    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [goals, timeRange]);

  const goalDistribution = useMemo(() => {
    return goals.map((g: Goal) => {
      let total = 0;
      g.problems.forEach(p => {
        p.hypotheses.forEach(h => {
          h.habits.forEach(hab => {
            hab.logs.forEach(log => {
              total += log.durationPerformed;
            });
          });
        });
      });
      return { name: g.title, value: total, color: g.color };
    }).filter((g: any) => g.value > 0);
  }, [goals]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-12"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-light tracking-tight">Analytics</h1>
          <p className="text-gray-500 font-serif italic">Measuring your evolution.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white border border-gray-100 rounded-full p-1 flex gap-1">
            {(['day', 'week', 'month', 'year'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize",
                  timeRange === r ? "bg-[#1A1A1A] text-white" : "text-gray-400 hover:text-gray-600"
                )}
              >
                {r}
              </button>
            ))}
          </div>
          <button 
            onClick={onExport}
            className="flex items-center gap-2 border border-gray-200 px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download size={18} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono uppercase tracking-widest text-gray-400">Actual vs Target (Minutes)</h3>
            <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#1A1A1A]" />
                <span>Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gray-200" />
                <span>Target</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="actual" fill="#1A1A1A" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="target" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono uppercase tracking-widest text-gray-400">Deficit & Cumulative Debt</h3>
            <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span>Lacking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Total Debt</span>
              </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="deficit" fill="#F87171" radius={[4, 4, 0, 0]} barSize={20} />
                <Line type="monotone" dataKey="cumulativeDebt" stroke="#FBBF24" strokeWidth={2} dot={{ r: 4, fill: '#FBBF24' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 space-y-6">
            <h3 className="text-sm font-mono uppercase tracking-widest text-gray-400">Records for this {timeRange}</h3>
            <div className="space-y-4">
              {dailyRecords.length === 0 ? (
                <p className="text-gray-400 text-sm italic py-8 text-center">No records found for this period.</p>
              ) : (
                dailyRecords.map((record) => (
                  <div key={record.id} className="group border-b border-gray-50 last:border-0 pb-4 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: record.color }} />
                        <span className="text-sm font-medium">{record.habitTitle}</span>
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-mono">{record.goalTitle}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{format(parseISO(record.date), 'MMM d, HH:mm')}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "font-mono font-medium",
                          record.duration < record.target ? "text-red-500" : "text-emerald-500"
                        )}>
                          {record.duration}m
                        </span>
                        <span className="text-gray-300">/</span>
                        <span className="text-gray-400">{record.target}m target</span>
                      </div>
                      {record.rating && (
                        <div className="flex items-center gap-1 text-amber-500 font-medium">
                          <Target size={10} /> {record.rating}/10
                        </div>
                      )}
                    </div>
                    {record.reflection && (
                      <p className="text-xs text-gray-500 italic line-clamp-1 group-hover:line-clamp-none transition-all">
                        "{record.reflection}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 space-y-6">
            <h3 className="text-sm font-mono uppercase tracking-widest text-gray-400">Goal Distribution</h3>
            {goalDistribution.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-gray-400 text-sm italic">
                No data recorded yet.
              </div>
            ) : (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={goalDistribution}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {goalDistribution.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-[#1A1A1A] text-white rounded-2xl p-8 space-y-6">
            <h3 className="text-xs font-mono uppercase tracking-widest opacity-50">Insights</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Total Evolution Time</p>
                <p className="text-2xl font-light">
                  {Math.floor(goalDistribution.reduce((acc, curr) => acc + curr.value, 0) / 60)}h {goalDistribution.reduce((acc, curr) => acc + curr.value, 0) % 60}m
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Target Completion Rate</p>
                <p className="text-2xl font-light">
                  {dailyRecords.length > 0 
                    ? Math.round((dailyRecords.filter(r => r.duration >= r.target).length / dailyRecords.length) * 100)
                    : 0}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-400">Missed Targets (This {timeRange})</p>
                <p className="text-2xl font-light text-red-400">
                  {dailyRecords.filter(r => r.duration < r.target).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Modals ---

function GoalFormModal({ onClose, onSubmit }: any) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    type: 'time' as GoalType,
    deadline: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    targetValue: 0,
    targetUnit: '',
    color: 'linear-gradient(135deg, #1A1A1A 0%, #4A4A4A 100%)'
  });

  const colorOptions = [
    { name: 'Onyx', value: 'linear-gradient(135deg, #1A1A1A 0%, #4A4A4A 100%)' },
    { name: 'Ocean', value: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' },
    { name: 'Ruby', value: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)' },
    { name: 'Emerald', value: 'linear-gradient(135deg, #10B981 0%, #047857 100%)' },
    { name: 'Amber', value: 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)' },
    { name: 'Violet', value: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)' },
    { name: 'Rose', value: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)' },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-lg rounded-3xl p-10 space-y-8 relative overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>

        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Step {step} of 4</span>
          <h2 className="text-3xl font-light tracking-tight">
            {step === 1 && "What's the outcome?"}
            {step === 2 && "How will you track it?"}
            {step === 3 && "When is the deadline?"}
            {step === 4 && "What's the target?"}
          </h2>
        </div>

        <div className="min-h-[160px]">
          {step === 1 && (
            <div className="space-y-6">
              <input 
                autoFocus
                type="text" 
                placeholder="e.g. Finish 10 chapters of Calculus"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full text-2xl font-light border-b-2 border-gray-100 focus:border-[#1A1A1A] focus:outline-none py-4 transition-all"
              />
              <div className="flex flex-wrap gap-3">
                {colorOptions.map(c => (
                  <button 
                    key={c.value}
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    className={cn(
                      "w-10 h-10 rounded-xl transition-all shadow-sm",
                      formData.color === c.value ? "ring-2 ring-offset-2 ring-[#1A1A1A] scale-110" : "opacity-60 hover:opacity-100"
                    )}
                    style={{ background: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => setFormData({ ...formData, type: 'time' })}
                className={cn(
                  "p-6 rounded-2xl border text-left transition-all",
                  formData.type === 'time' ? "border-[#1A1A1A] bg-gray-50" : "border-gray-100 hover:border-gray-200"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Timer size={20} />
                  <span className="font-medium">Time-based Tracking</span>
                </div>
                <p className="text-xs text-gray-500">Track progress by the amount of time spent on habits. Best for study, practice, or work.</p>
              </button>
              <button 
                onClick={() => setFormData({ ...formData, type: 'rating' })}
                className={cn(
                  "p-6 rounded-2xl border text-left transition-all",
                  formData.type === 'rating' ? "border-[#1A1A1A] bg-gray-50" : "border-gray-100 hover:border-gray-200"
                )}
              >
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 size={20} />
                  <span className="font-medium">Rating-based Tracking</span>
                </div>
                <p className="text-xs text-gray-500">Rate your performance at the end of each session (1-10). Best for quality-focused goals like meditation or mood.</p>
              </button>
            </div>
          )}

          {step === 3 && (
            <input 
              autoFocus
              type="date" 
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full text-2xl font-light border-b-2 border-gray-100 focus:border-[#1A1A1A] focus:outline-none py-4 transition-all"
            />
          )}

          {step === 4 && (
            <div className="flex gap-4">
              <input 
                autoFocus
                type="number" 
                placeholder="0"
                value={formData.targetValue || ''}
                onChange={(e) => setFormData({ ...formData, targetValue: Number(e.target.value) })}
                className="w-1/3 text-2xl font-light border-b-2 border-gray-100 focus:border-[#1A1A1A] focus:outline-none py-4 transition-all"
              />
              <input 
                type="text" 
                placeholder="unit (e.g. chapters, hours)"
                value={formData.targetUnit}
                onChange={(e) => setFormData({ ...formData, targetUnit: e.target.value })}
                className="w-2/3 text-2xl font-light border-b-2 border-gray-100 focus:border-[#1A1A1A] focus:outline-none py-4 transition-all"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="text-gray-400 font-medium">Back</button>
          ) : <div />}
          
          {step < 4 ? (
            <button 
              disabled={step === 1 && !formData.title}
              onClick={() => setStep(step + 1)} 
              className="bg-[#1A1A1A] text-white px-8 py-3 rounded-full font-medium disabled:opacity-30 transition-all"
            >
              Next
            </button>
          ) : (
            <button 
              disabled={!formData.targetUnit || !formData.targetValue}
              onClick={() => onSubmit(formData)} 
              className="bg-[#1A1A1A] text-white px-8 py-3 rounded-full font-medium disabled:opacity-30 transition-all"
            >
              Create Goal
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function TaskFormModal({ onClose, onSubmit }: any) {
  const [title, setTitle] = useState('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-light">Add Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-[#1A1A1A] transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Task Title</label>
            <input 
              autoFocus
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#1A1A1A] transition-all"
            />
          </div>
        </div>

        <button 
          onClick={() => title && onSubmit(title)}
          className="w-full bg-[#1A1A1A] text-white py-4 rounded-2xl font-medium hover:scale-[1.02] transition-all"
        >
          Add to Checklist
        </button>
      </motion.div>
    </div>
  );
}

function HabitFormModal({ onClose, onSubmit, goalType }: any) {
  const isRatingType = goalType === 'rating';
  const [formData, setFormData] = useState({
    title: '',
    days: [1, 2, 3, 4, 5],
    startTime: '09:00',
    duration: 30,
    showInChecklist: isRatingType
  });

  const toggleDay = (day: number) => {
    if (formData.days.includes(day)) {
      setFormData({ ...formData, days: formData.days.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, days: [...formData.days, day] });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-lg rounded-3xl p-10 space-y-8 relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>

        <header className="space-y-2">
          <h2 className="text-3xl font-light tracking-tight">Plan the Habit</h2>
          <p className="text-gray-500 text-sm">Consistency is the key to testing your hypothesis.</p>
        </header>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Habit Name</label>
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. Morning Deep Work"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border-b border-gray-100 focus:border-[#1A1A1A] focus:outline-none py-2 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Schedule</label>
            <div className="flex gap-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <button 
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-xs font-mono transition-all",
                    formData.days.includes(i) ? "bg-[#1A1A1A] text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Show in Daily Checklist</p>
              <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">Appear in today's task list</p>
            </div>
            <button 
              onClick={() => setFormData({ ...formData, showInChecklist: !formData.showInChecklist })}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                formData.showInChecklist ? "bg-[#1A1A1A]" : "bg-gray-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                formData.showInChecklist ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          {!isRatingType && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Start Time</label>
                <input 
                  type="time" 
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full border-b border-gray-100 focus:border-[#1A1A1A] focus:outline-none py-2 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Duration (min)</label>
                <input 
                  type="number" 
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                  className="w-full border-b border-gray-100 focus:border-[#1A1A1A] focus:outline-none py-2 transition-all"
                />
              </div>
            </div>
          )}
        </div>

        <button 
          disabled={!formData.title}
          onClick={() => onSubmit(formData)}
          className="w-full bg-[#1A1A1A] text-white py-4 rounded-full font-medium disabled:opacity-30 transition-all mt-4"
        >
          Add Habit to Plan
        </button>
      </motion.div>
    </div>
  );
}

function ReflectionModal({ text, setText, rating, setRating, isRatingType, onSave, duration }: any) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-lg rounded-3xl p-10 space-y-8 text-center"
      >
        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} />
        </div>

        <header className="space-y-2">
          <h2 className="text-3xl font-light tracking-tight">Session Complete</h2>
          <p className="text-gray-500">You tracked {Math.floor(duration / 60)}m {duration % 60}s of progress.</p>
        </header>

        <div className="space-y-6 text-left">
          {isRatingType && (
            <div className="space-y-4">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Performance Rating (1-10)</label>
              <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                  <button 
                    key={r}
                    onClick={() => setRating(r)}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono transition-all",
                      rating === r ? "bg-[#1A1A1A] text-white scale-110" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">What did you learn?</label>
            <textarea 
              autoFocus
              placeholder="Capture your insights, obstacles, or adjustments for the next session..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl px-6 py-6 focus:ring-1 focus:ring-[#1A1A1A] focus:outline-none min-h-[150px] resize-none"
            />
          </div>
        </div>

        <button 
          onClick={onSave}
          className="w-full bg-[#1A1A1A] text-white py-4 rounded-full font-medium hover:scale-[1.02] transition-transform"
        >
          Save Reflection
        </button>
      </motion.div>
    </div>
  );
}
