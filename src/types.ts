export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  budgetLimit: number;
  aiPersonality: 'Calm' | 'Energetic' | 'Cynical' | 'Logical';
  dailyPlanningReminderTime: string; // e.g. "21:00"
  hasPlannedTomorrow: boolean;
  listeningMode?: 'always-listening' | 'push-to-talk' | 'text-only';
  proactiveModeEnabled?: boolean;
  maxProactiveNudges?: number;
  dailyReviewTime?: string;
  learnedPatterns?: string[];
  activationWord?: string;
}

export type TaskPriority = 'urgent-important' | 'important-not-urgent' | 'urgent-not-important' | 'not-urgent-not-important';

export interface DeferRecord {
  timestamp: string;
  fromDate: string;
  toDate: string;
  fromTime?: string;
  toTime?: string;
  reason: string;
  deferIndex: number;
}

export interface Task {
  id: string;
  title: string;
  category: TaskPriority;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  endTime?: string; // HH:MM
  description?: string; // Additional details
  recurType: 'none' | 'daily' | 'weekly';
  status: 'pending' | 'completed';
  originalDate?: string; // Track original date for skipped list
  rescheduledCount: number;
  maxDeferLimit?: number; // Maximum times this task is allowed to be deferred (default e.g. 3)
  deferReason?: string; // Last stated reason for deferral
  deferHistory?: DeferRecord[]; // Historic audit log of all deferrals
}

export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  logs: string[]; // Array of YYYY-MM-DD completion dates
  skippedDaysCount: number;
  icon?: string;
  category?: 'water' | 'nutrition' | 'fitness' | 'reading' | 'mindfulness' | 'productivity' | 'general';
  targetValue?: number; // e.g. 8 glasses, 2500 ml, 3 meals, 45 mins
  unit?: string; // e.g. "glasses", "ml", "meals", "mins", "pages", "steps", "times"
  stepIncrement?: number; // amount to add per tap (e.g. +1 or +250)
  dailyProgress?: Record<string, number>; // dateStr -> quantity logged on that date
  notes?: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: 'food' | 'transportation' | 'shopping' | 'education' | 'healthcare' | 'entertainment' | 'misc';
  note: string;
  date: string; // YYYY-MM-DD
  isImpulsive?: boolean;
  explanation?: string; // User's self-reflection if impulsive/over-budget
}

export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  type?: 'chat' | 'scheduling' | 'predictive' | 'motivation';
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'reminder' | 'warning' | 'streak' | 'budget';
  read: boolean;
}

// --- NEW: Strategic Goals Module ---
export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: string; // YYYY-MM-DD
  progress: number; // 0 to 100
  status: 'active' | 'completed' | 'paused';
}

// --- NEW: Nightly Diary Module ---
export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO String
  content: string;
  review: string;
  mood: string;
  productivityScore: number; // 0 to 100
}

export interface FullOSData {
  profile: UserProfile;
  tasks: Task[];
  habits: Habit[];
  goals: Goal[]; // <-- We wired this in!
  expenses: Expense[];
  budgets: CategoryBudget[];
  chatHistory: ChatMessage[];
  notifications: SystemNotification[];
  diaryEntries?: DiaryEntry[]; // <-- Added Nightly Diary Support!
}