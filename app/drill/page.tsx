'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { DrillItem, DrillSession } from '@/lib/types';
import type { UsageCategory } from '@/lib/constants';
import { selectAdaptiveItems, selectFocusedItems } from '@/lib/adaptive';
import { getLatestDiagnostic, getSessions, addSession, updateProgress, getProgress, hasMeaningfulEngagement } from '@/lib/storage';
import SyncPrompt from '@/components/SyncPrompt';

const CATEGORY_LABELS: Record<UsageCategory, string> = {
  collocations: 'Collocations',
  prepositions: 'Prepositions',
  register: 'Register & Formality',
  grammar_frames: 'Grammar Frames',
  word_forms: 'Word Forms',
};

const DRILL_DURATION = 600; // 10 minutes in seconds
const ITEMS_PER_SESSION = 20;

function DrillContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusCategory = searchParams.get('focus') as UsageCategory | null;

  const [phase, setPhase] = useState<'intro' | 'active' | 'complete'>('intro');
  const [items, setItems] = useState<DrillItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(DRILL_DURATION);
  const [sessionResults, setSessionResults] = useState<{
    itemId: string;
    correct: boolean;
    timeSpent: number;
  }[]>([]);
  const [itemStartTime, setItemStartTime] = useState(0);
  const [showSyncPrompt, setShowSyncPrompt] = useState(false);

  // Initialize items
  useEffect(() => {
    const diagnostic = getLatestDiagnostic();
    const recentSessions = getSessions().slice(-5);

    let selectedItems: DrillItem[];
    if (focusCategory) {
      selectedItems = selectFocusedItems(focusCategory, ITEMS_PER_SESSION);
    } else {
      selectedItems = selectAdaptiveItems(ITEMS_PER_SESSION, diagnostic, recentSessions, []);
    }

    setItems(selectedItems);
  }, [focusCategory]);

  // Timer
  useEffect(() => {
    if (phase !== 'active') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          finishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startDrill = () => {
    setPhase('active');
    setItemStartTime(Date.now());
  };

  const handleAnswer = useCallback(() => {
    if (!selectedAnswer || !items[currentIndex]) return;

    const item = items[currentIndex];
    const isCorrect = Array.isArray(item.answer)
      ? JSON.stringify(selectedAnswer) === JSON.stringify(item.answer)
      : selectedAnswer === item.answer;

    const timeSpent = Date.now() - itemStartTime;

    // Update items with result
    const updatedItems = [...items];
    updatedItems[currentIndex] = {
      ...item,
      userAnswer: selectedAnswer,
      correct: isCorrect,
      timeSpent,
    };
    setItems(updatedItems);

    // Add to results
    setSessionResults((prev) => [...prev, { itemId: item.id, correct: isCorrect, timeSpent }]);

    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setSelectedAnswer('');

      if (currentIndex < items.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setItemStartTime(Date.now());
      } else {
        finishSession();
      }
    }, 1500);
  }, [selectedAnswer, items, currentIndex, itemStartTime]);

  const finishSession = useCallback(() => {
    // Calculate results
    const answeredItems = items.filter((item) => item.correct !== undefined);
    const correctCount = answeredItems.filter((item) => item.correct).length;
    const accuracy = answeredItems.length > 0 ? correctCount / answeredItems.length : 0;

    // Category breakdown
    const categoryBreakdown: Record<UsageCategory, { correct: number; total: number }> = {
      collocations: { correct: 0, total: 0 },
      prepositions: { correct: 0, total: 0 },
      register: { correct: 0, total: 0 },
      grammar_frames: { correct: 0, total: 0 },
      word_forms: { correct: 0, total: 0 },
    };

    answeredItems.forEach((item) => {
      categoryBreakdown[item.category].total++;
      if (item.correct) {
        categoryBreakdown[item.category].correct++;
      }
    });

    const session: DrillSession = {
      id: `session-${Date.now()}`,
      createdAt: new Date().toISOString(),
      mode: focusCategory ? 'focused' : 'adaptive',
      durationSec: DRILL_DURATION - timeRemaining,
      items: answeredItems,
      results: {
        totalItems: answeredItems.length,
        correct: correctCount,
        accuracy,
        categoryBreakdown,
      },
    };

    addSession(session);

    // Update progress
    const progress = getProgress();
    if (progress) {
      const today = new Date().toISOString().split('T')[0];

      // Update usage accuracy
      const usageAccuracy = { ...progress.usageAccuracy };
      Object.entries(categoryBreakdown).forEach(([cat, data]) => {
        if (data.total > 0) {
          const category = cat as UsageCategory;
          usageAccuracy[category] = [
            ...usageAccuracy[category],
            { date: today, accuracy: data.correct / data.total },
          ].slice(-30); // Keep last 30 entries
        }
      });

      updateProgress({
        totalDrillTime: progress.totalDrillTime + session.durationSec,
        drillsCompleted: progress.drillsCompleted + 1,
        usageAccuracy,
      });
    }

    setPhase('complete');

    // Check if should show sync prompt
    if (hasMeaningfulEngagement()) {
      setTimeout(() => setShowSyncPrompt(true), 1000);
    }
  }, [items, focusCategory, timeRemaining]);

  // Intro phase
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {focusCategory
                  ? `${CATEGORY_LABELS[focusCategory]} Drill`
                  : 'Adaptive Practice Drill'}
              </h1>
              <p className="text-gray-600">
                {focusCategory
                  ? `Focused practice on your ${CATEGORY_LABELS[focusCategory].toLowerCase()} skills.`
                  : 'Questions are selected based on your diagnostic results and recent performance.'}
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">10-minute session</div>
                  <div className="text-sm text-gray-500">Complete as many questions as you can</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{items.length} questions ready</div>
                  <div className="text-sm text-gray-500">Instant feedback after each answer</div>
                </div>
              </div>
            </div>

            <button
              onClick={startDrill}
              disabled={items.length === 0}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {items.length === 0 ? 'Loading...' : 'Start Drill'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active phase
  if (phase === 'active' && items[currentIndex]) {
    const item = items[currentIndex];
    const isCorrect = selectedAnswer === item.answer;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Progress bar */}
        <div className="fixed top-16 left-0 right-0 bg-white border-b z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-32 h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-gray-500">
                {currentIndex + 1}/{items.length}
              </span>
            </div>
            <div className={`text-sm font-mono ${timeRemaining < 60 ? 'text-red-600' : 'text-gray-600'}`}>
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        <div className="pt-28 pb-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="mb-2">
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {CATEGORY_LABELS[item.category]}
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">{item.prompt}</h3>

              {item.choices && (
                <div className="space-y-3">
                  {item.choices.map((choice, index) => {
                    let buttonClass = 'w-full text-left p-4 rounded-xl border-2 transition-all ';

                    if (showFeedback) {
                      if (choice === item.answer) {
                        buttonClass += 'border-green-500 bg-green-50 text-green-700';
                      } else if (choice === selectedAnswer && !isCorrect) {
                        buttonClass += 'border-red-500 bg-red-50 text-red-700';
                      } else {
                        buttonClass += 'border-gray-200 text-gray-400';
                      }
                    } else {
                      if (choice === selectedAnswer) {
                        buttonClass += 'border-blue-500 bg-blue-50';
                      } else {
                        buttonClass += 'border-gray-200 hover:border-blue-500 hover:bg-blue-50';
                      }
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => !showFeedback && setSelectedAnswer(choice)}
                        disabled={showFeedback}
                        className={buttonClass}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              )}

              {showFeedback && (
                <div className={`mt-6 p-4 rounded-xl ${isCorrect ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <p className={`font-medium ${isCorrect ? 'text-green-700' : 'text-amber-700'}`}>
                    {isCorrect ? 'Correct!' : `The answer is: ${item.answer}`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{item.explanation}</p>
                </div>
              )}

              {!showFeedback && selectedAnswer && (
                <button
                  onClick={handleAnswer}
                  className="w-full mt-6 bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Submit Answer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Complete phase
  if (phase === 'complete') {
    const answeredItems = items.filter((item) => item.correct !== undefined);
    const correctCount = answeredItems.filter((item) => item.correct).length;
    const accuracy = answeredItems.length > 0 ? Math.round((correctCount / answeredItems.length) * 100) : 0;

    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Drill Complete!</h1>
            <p className="text-gray-600 mb-6">
              Time: {formatTime(DRILL_DURATION - timeRemaining)}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-gray-900">{answeredItems.length}</div>
                <div className="text-sm text-gray-500">Questions</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-600">{correctCount}</div>
                <div className="text-sm text-gray-500">Correct</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className={`text-2xl font-bold ${accuracy >= 70 ? 'text-green-600' : accuracy >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {accuracy}%
                </div>
                <div className="text-sm text-gray-500">Accuracy</div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/drill')}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Practice Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                View Progress
              </button>
            </div>
          </div>
        </div>

        {showSyncPrompt && <SyncPrompt onDismiss={() => setShowSyncPrompt(false)} />}
      </div>
    );
  }

  return null;
}

export default function DrillPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DrillContent />
    </Suspense>
  );
}
