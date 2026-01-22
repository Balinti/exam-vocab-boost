'use client';

import { STORAGE_KEYS } from './constants';
import type { UserProfile, UserProgress, DiagnosticResult, DrillSession, Entitlement } from './types';

// Type-safe localStorage wrapper
function getItem<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

// Profile
export function getProfile(): UserProfile | null {
  return getItem<UserProfile>(STORAGE_KEYS.PROFILE);
}

export function setProfile(profile: UserProfile): void {
  setItem(STORAGE_KEYS.PROFILE, { ...profile, updatedAt: new Date().toISOString() });
}

export function updateProfile(updates: Partial<UserProfile>): void {
  const current = getProfile();
  const updated: UserProfile = {
    ...(current || { createdAt: new Date().toISOString() }),
    ...updates,
    updatedAt: new Date().toISOString(),
  } as UserProfile;
  setProfile(updated);
}

// Progress
export function getProgress(): UserProgress | null {
  return getItem<UserProgress>(STORAGE_KEYS.PROGRESS);
}

export function setProgress(progress: UserProgress): void {
  setItem(STORAGE_KEYS.PROGRESS, { ...progress, lastUpdated: new Date().toISOString() });
}

export function initializeProgress(): UserProgress {
  const defaultProgress: UserProgress = {
    totalDrillTime: 0,
    drillsCompleted: 0,
    readingHistory: [],
    usageAccuracy: {
      collocations: [],
      prepositions: [],
      register: [],
      grammar_frames: [],
      word_forms: [],
    },
    examReadinessScore: 0,
    lastUpdated: new Date().toISOString(),
  };
  setProgress(defaultProgress);
  return defaultProgress;
}

export function updateProgress(updates: Partial<UserProgress>): UserProgress {
  const current = getProgress() || initializeProgress();
  const updated = { ...current, ...updates, lastUpdated: new Date().toISOString() };
  setProgress(updated);
  return updated;
}

// Diagnostics
export function getDiagnostics(): DiagnosticResult[] {
  return getItem<DiagnosticResult[]>(STORAGE_KEYS.DIAGNOSTICS) || [];
}

export function addDiagnostic(diagnostic: DiagnosticResult): void {
  const diagnostics = getDiagnostics();
  diagnostics.push(diagnostic);
  setItem(STORAGE_KEYS.DIAGNOSTICS, diagnostics);
}

export function updateDiagnostic(id: string, updates: Partial<DiagnosticResult>): void {
  const diagnostics = getDiagnostics();
  const index = diagnostics.findIndex(d => d.id === id);
  if (index >= 0) {
    diagnostics[index] = { ...diagnostics[index], ...updates };
    setItem(STORAGE_KEYS.DIAGNOSTICS, diagnostics);
  }
}

export function getLatestDiagnostic(): DiagnosticResult | null {
  const diagnostics = getDiagnostics();
  return diagnostics.length > 0 ? diagnostics[diagnostics.length - 1] : null;
}

// Sessions
export function getSessions(): DrillSession[] {
  return getItem<DrillSession[]>(STORAGE_KEYS.SESSIONS) || [];
}

export function addSession(session: DrillSession): void {
  const sessions = getSessions();
  sessions.push(session);
  setItem(STORAGE_KEYS.SESSIONS, sessions);
}

export function getRecentSessions(count: number = 10): DrillSession[] {
  const sessions = getSessions();
  return sessions.slice(-count);
}

// Entitlement
export function getEntitlement(): Entitlement {
  return getItem<Entitlement>(STORAGE_KEYS.ENTITLEMENT) || { tier: 'free', active: false };
}

export function setEntitlement(entitlement: Entitlement): void {
  setItem(STORAGE_KEYS.ENTITLEMENT, entitlement);
}

// Clear all data
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => removeItem(key));
}

// Export all data for cloud sync
export function exportAllData(): Record<string, unknown> {
  return {
    profile: getProfile(),
    progress: getProgress(),
    diagnostics: getDiagnostics(),
    sessions: getSessions(),
    entitlement: getEntitlement(),
  };
}

// Import data from cloud sync
export function importAllData(data: Record<string, unknown>): void {
  if (data.profile) setItem(STORAGE_KEYS.PROFILE, data.profile);
  if (data.progress) setItem(STORAGE_KEYS.PROGRESS, data.progress);
  if (data.diagnostics) setItem(STORAGE_KEYS.DIAGNOSTICS, data.diagnostics);
  if (data.sessions) setItem(STORAGE_KEYS.SESSIONS, data.sessions);
  if (data.entitlement) setItem(STORAGE_KEYS.ENTITLEMENT, data.entitlement);
}

// Check if user has meaningful engagement
export function hasMeaningfulEngagement(): boolean {
  const diagnostics = getDiagnostics();
  const sessions = getSessions();
  return diagnostics.some(d => d.completedAt) || sessions.length > 0;
}
