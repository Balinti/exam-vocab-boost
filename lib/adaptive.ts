import type { UsageCategory, DrillType } from './constants';
import type { DrillItem, BundleState, DiagnosticResult, DrillSession } from './types';
import seedBundles from '@/data/seed-bundles.json';
import seedUsageItems from '@/data/seed-usage-items.json';

interface UsageItem {
  id: string;
  category: UsageCategory;
  type: DrillType;
  prompt: string;
  choices?: string[];
  tokens?: string[];
  answer: string | string[];
  explanation: string;
  difficulty: string;
}

interface BundleItem {
  id: string;
  itemType: DrillType;
  prompt: string;
  choices?: string[];
  tokens?: string[];
  answer: string | string[];
  explanation: string;
  errorTag: UsageCategory;
}

interface Bundle {
  id: string;
  items: BundleItem[];
}

// Get all available drill items from seed data
function getAllDrillItems(): DrillItem[] {
  const items: DrillItem[] = [];

  // Add items from bundles
  (seedBundles as Bundle[]).forEach(bundle => {
    bundle.items.forEach(item => {
      items.push({
        id: item.id,
        type: item.itemType as DrillType,
        category: item.errorTag as UsageCategory,
        prompt: item.prompt,
        choices: item.choices,
        tokens: item.tokens,
        answer: item.answer,
        explanation: item.explanation,
      });
    });
  });

  // Add standalone usage items
  (seedUsageItems as UsageItem[]).forEach(item => {
    items.push({
      id: item.id,
      type: item.type as DrillType,
      category: item.category as UsageCategory,
      prompt: item.prompt,
      choices: item.choices,
      tokens: item.tokens,
      answer: item.answer,
      explanation: item.explanation,
    });
  });

  return items;
}

// Calculate category weakness scores from diagnostic
export function getWeaknessScores(diagnostic: DiagnosticResult | null): Record<UsageCategory, number> {
  const defaultScores: Record<UsageCategory, number> = {
    collocations: 0.5,
    prepositions: 0.5,
    register: 0.5,
    grammar_frames: 0.5,
    word_forms: 0.5,
  };

  if (!diagnostic?.usage?.categoryScores) return defaultScores;

  const scores = { ...defaultScores };
  Object.entries(diagnostic.usage.categoryScores).forEach(([category, data]) => {
    const cat = category as UsageCategory;
    if (data.total > 0) {
      // Lower accuracy = higher weakness score
      scores[cat] = 1 - (data.correct / data.total);
    }
  });

  return scores;
}

// Get weakness scores from recent sessions
export function getSessionWeaknessScores(sessions: DrillSession[]): Record<UsageCategory, number> {
  const totals: Record<UsageCategory, { correct: number; total: number }> = {
    collocations: { correct: 0, total: 0 },
    prepositions: { correct: 0, total: 0 },
    register: { correct: 0, total: 0 },
    grammar_frames: { correct: 0, total: 0 },
    word_forms: { correct: 0, total: 0 },
  };

  sessions.forEach(session => {
    if (session.results?.categoryBreakdown) {
      Object.entries(session.results.categoryBreakdown).forEach(([cat, data]) => {
        const category = cat as UsageCategory;
        if (totals[category]) {
          totals[category].correct += data.correct;
          totals[category].total += data.total;
        }
      });
    }
  });

  const scores: Record<UsageCategory, number> = {
    collocations: 0.5,
    prepositions: 0.5,
    register: 0.5,
    grammar_frames: 0.5,
    word_forms: 0.5,
  };

  Object.entries(totals).forEach(([cat, data]) => {
    if (data.total > 0) {
      scores[cat as UsageCategory] = 1 - (data.correct / data.total);
    }
  });

  return scores;
}

// Combine diagnostic and session weakness scores
function combineWeaknessScores(
  diagnosticScores: Record<UsageCategory, number>,
  sessionScores: Record<UsageCategory, number>
): Record<UsageCategory, number> {
  const combined: Record<UsageCategory, number> = {} as Record<UsageCategory, number>;

  Object.keys(diagnosticScores).forEach(cat => {
    const category = cat as UsageCategory;
    // Weight recent sessions more heavily
    combined[category] = diagnosticScores[category] * 0.3 + sessionScores[category] * 0.7;
  });

  return combined;
}

// Simple SRS: calculate next review interval
export function calculateNextInterval(
  currentInterval: number,
  ease: number,
  wasCorrect: boolean
): { interval: number; ease: number } {
  let newEase = ease;
  let newInterval = currentInterval;

  if (wasCorrect) {
    newInterval = Math.max(1, Math.round(currentInterval * ease));
    newEase = Math.min(3.0, ease + 0.1);
  } else {
    newInterval = 1;
    newEase = Math.max(1.3, ease - 0.2);
  }

  return { interval: newInterval, ease: newEase };
}

// Check if bundle is due for review
export function isBundleDue(state: BundleState): boolean {
  const dueDate = new Date(state.dueAt);
  return dueDate <= new Date();
}

// Select items for adaptive drill
export function selectAdaptiveItems(
  count: number,
  diagnostic: DiagnosticResult | null,
  recentSessions: DrillSession[],
  bundleStates: BundleState[],
  usedItemIds: Set<string> = new Set()
): DrillItem[] {
  const allItems = getAllDrillItems();
  const diagnosticScores = getWeaknessScores(diagnostic);
  const sessionScores = getSessionWeaknessScores(recentSessions);
  const weaknessScores = combineWeaknessScores(diagnosticScores, sessionScores);

  // Filter out already used items
  const availableItems = allItems.filter(item => !usedItemIds.has(item.id));

  // Sort items by weakness score (higher weakness = more likely to be selected)
  const sortedItems = availableItems.map(item => ({
    item,
    weight: weaknessScores[item.category] + Math.random() * 0.3, // Add some randomness
  })).sort((a, b) => b.weight - a.weight);

  // Check for due bundles
  const dueBundleIds = new Set(
    bundleStates.filter(isBundleDue).map(state => state.bundleId)
  );

  // Prioritize items from due bundles
  const dueItems = sortedItems.filter(({ item }) => {
    const bundle = (seedBundles as Bundle[]).find(b =>
      b.items.some(bi => bi.id === item.id)
    );
    return bundle && dueBundleIds.has(bundle.id);
  });

  const nonDueItems = sortedItems.filter(({ item }) => {
    const bundle = (seedBundles as Bundle[]).find(b =>
      b.items.some(bi => bi.id === item.id)
    );
    return !bundle || !dueBundleIds.has(bundle.id);
  });

  // Combine: prioritize due items, then weakness-weighted items
  const orderedItems = [...dueItems, ...nonDueItems];

  // Ensure variety by limiting items per category
  const selectedItems: DrillItem[] = [];
  const categoryCount: Record<string, number> = {};
  const maxPerCategory = Math.ceil(count / 3);

  for (const { item } of orderedItems) {
    if (selectedItems.length >= count) break;

    const catCount = categoryCount[item.category] || 0;
    if (catCount < maxPerCategory) {
      selectedItems.push(item);
      categoryCount[item.category] = catCount + 1;
    }
  }

  // Fill remaining slots if needed
  if (selectedItems.length < count) {
    for (const { item } of orderedItems) {
      if (selectedItems.length >= count) break;
      if (!selectedItems.find(i => i.id === item.id)) {
        selectedItems.push(item);
      }
    }
  }

  // Shuffle the final selection
  return shuffleArray(selectedItems);
}

// Select items for focused drill on specific category
export function selectFocusedItems(
  category: UsageCategory,
  count: number,
  usedItemIds: Set<string> = new Set()
): DrillItem[] {
  const allItems = getAllDrillItems();
  const categoryItems = allItems.filter(
    item => item.category === category && !usedItemIds.has(item.id)
  );

  return shuffleArray(categoryItems).slice(0, count);
}

// Utility: shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Calculate exam readiness score
export function calculateExamReadiness(
  diagnostic: DiagnosticResult | null,
  recentSessions: DrillSession[]
): number {
  let score = 50; // Base score

  if (diagnostic?.completedAt) {
    // Reading component
    const readingScore = diagnostic.reading.accuracy * 30;

    // Usage component
    let usageAccuracy = 0;
    let totalItems = 0;
    Object.values(diagnostic.usage.categoryScores).forEach(cat => {
      usageAccuracy += cat.correct;
      totalItems += cat.total;
    });
    const usageScore = totalItems > 0 ? (usageAccuracy / totalItems) * 30 : 15;

    score = 40 + readingScore + usageScore;
  }

  // Adjust based on recent drill performance
  if (recentSessions.length > 0) {
    const recentAccuracy = recentSessions.reduce((sum, s) =>
      sum + (s.results?.accuracy || 0), 0) / recentSessions.length;
    score = score * 0.7 + recentAccuracy * 100 * 0.3;
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

// Get top weakness categories
export function getTopWeaknesses(
  diagnostic: DiagnosticResult | null,
  recentSessions: DrillSession[],
  count: number = 3
): UsageCategory[] {
  const diagnosticScores = getWeaknessScores(diagnostic);
  const sessionScores = getSessionWeaknessScores(recentSessions);
  const combined = combineWeaknessScores(diagnosticScores, sessionScores);

  return Object.entries(combined)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([cat]) => cat as UsageCategory);
}
