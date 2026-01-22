// Shared Supabase Auth Instance (HARDCODED as per spec)
export const SHARED_SUPABASE_URL = 'https://api.srv936332.hstgr.cloud';
export const SHARED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzM2NjIyNDAwLAogICJleHAiOiAxODk0Mzg4ODAwCn0.FyT4wqGqgkMOlnPr-W4I3xZcvPsOsqdMqOgflJhdBWo';

// App slug for tracking
export const APP_SLUG = 'exam-vocab-boost';

// localStorage keys
export const STORAGE_KEYS = {
  PROFILE: 'evb_v1_profile',
  PROGRESS: 'evb_v1_progress',
  DIAGNOSTICS: 'evb_v1_diagnostics',
  SESSIONS: 'evb_v1_sessions',
  ENTITLEMENT: 'evb_v1_entitlement',
} as const;

// Exam types
export const EXAM_TYPES = ['IELTS', 'TOEFL'] as const;
export type ExamType = typeof EXAM_TYPES[number];

// Difficulty levels
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
export type Level = typeof LEVELS[number];

// Common L1 languages
export const L1_LANGUAGES = [
  'Chinese',
  'Spanish',
  'Arabic',
  'Japanese',
  'Korean',
  'Portuguese',
  'French',
  'German',
  'Russian',
  'Vietnamese',
  'Other',
] as const;

// Usage categories
export const USAGE_CATEGORIES = [
  'collocations',
  'prepositions',
  'register',
  'grammar_frames',
  'word_forms',
] as const;
export type UsageCategory = typeof USAGE_CATEGORIES[number];

// Drill types
export const DRILL_TYPES = [
  'collocation_mcq',
  'preposition_fill',
  'register_choice',
  'sentence_build',
] as const;
export type DrillType = typeof DRILL_TYPES[number];

// Pricing tiers
export const PRICING_TIERS = {
  TIER_1: {
    name: 'Full Access',
    price: 39.99,
    features: [
      'Unlimited adaptive drills',
      'Full diagnostic reports',
      'All usage categories',
      'Progress tracking forever',
      'Personalized fix plans',
    ],
  },
  TIER_2: {
    name: 'Full Access + Cram Mode Pack',
    price: 59.99,
    features: [
      'Everything in Full Access',
      'Intensive cram mode drills',
      'Exam day prep guides',
      'Priority support',
      'Downloadable study materials',
    ],
  },
} as const;
