import { ExamType, Level, UsageCategory, DrillType } from './constants';

// User profile stored in localStorage
export interface UserProfile {
  examType?: ExamType;
  examDate?: string;
  targetScore?: string;
  l1?: string;
  levelEstimate?: Level;
  createdAt: string;
  updatedAt: string;
}

// Diagnostic results
export interface DiagnosticResult {
  id: string;
  startedAt: string;
  completedAt?: string;
  reading: {
    passageId: string;
    wpm: number;
    accuracy: number;
    timeSpent: number;
    answers: { questionId: string; selected: string; correct: boolean }[];
  };
  usage: {
    items: {
      itemId: string;
      category: UsageCategory;
      correct: boolean;
      timeSpent: number;
    }[];
    categoryScores: Record<UsageCategory, { correct: number; total: number }>;
  };
  weaknesses: UsageCategory[];
}

// Progress tracking
export interface UserProgress {
  totalDrillTime: number;
  drillsCompleted: number;
  readingHistory: { date: string; wpm: number; accuracy: number }[];
  usageAccuracy: Record<UsageCategory, { date: string; accuracy: number }[]>;
  examReadinessScore: number;
  lastUpdated: string;
}

// Drill session
export interface DrillSession {
  id: string;
  createdAt: string;
  mode: 'adaptive' | 'focused' | 'cram';
  durationSec: number;
  items: DrillItem[];
  results: {
    totalItems: number;
    correct: number;
    accuracy: number;
    categoryBreakdown: Record<UsageCategory, { correct: number; total: number }>;
  };
}

// Individual drill item
export interface DrillItem {
  id: string;
  type: DrillType;
  category: UsageCategory;
  prompt: string;
  choices?: string[];
  tokens?: string[];
  answer: string | string[];
  explanation: string;
  userAnswer?: string | string[];
  correct?: boolean;
  timeSpent?: number;
}

// Bundle (for SRS)
export interface Bundle {
  id: string;
  examType: ExamType;
  level: Level;
  headword: string;
  tags: string[];
  items: BundleItem[];
}

export interface BundleItem {
  id: string;
  bundleId: string;
  itemType: DrillType;
  prompt: string;
  choices?: string[];
  answer: string | string[];
  explanation: string;
  errorTag: UsageCategory;
}

// User bundle state (SRS)
export interface BundleState {
  bundleId: string;
  ease: number;
  intervalDays: number;
  dueAt: string;
  lastResult?: {
    correct: boolean;
    timestamp: string;
  };
}

// Entitlement
export interface Entitlement {
  tier: 'free' | 'tier_1' | 'tier_2';
  active: boolean;
  purchasedAt?: string;
}

// Reading passage
export interface ReadingPassage {
  id: string;
  title: string;
  content: string;
  wordCount: number;
  difficulty: Level;
  examType: ExamType;
  questions: ReadingQuestion[];
}

export interface ReadingQuestion {
  id: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
}

// Auth user (from shared Supabase)
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
