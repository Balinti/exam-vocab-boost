'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { DiagnosticResult, ReadingPassage } from '@/lib/types';
import type { UsageCategory } from '@/lib/constants';
import { addDiagnostic, updateDiagnostic, getLatestDiagnostic } from '@/lib/storage';
import seedPassages from '@/data/seed-passages.json';
import seedUsageItems from '@/data/seed-usage-items.json';

type Phase = 'intro' | 'reading' | 'usage' | 'complete';

interface UsageItem {
  id: string;
  category: UsageCategory;
  type: string;
  prompt: string;
  choices: string[];
  answer: string;
  explanation: string;
  difficulty: string;
}

export default function DiagnosticPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('intro');
  const [diagnosticId, setDiagnosticId] = useState<string>('');

  // Reading state
  const [passage, setPassage] = useState<ReadingPassage | null>(null);
  const [readingStartTime, setReadingStartTime] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [readingAnswers, setReadingAnswers] = useState<{ questionId: string; selected: string; correct: boolean }[]>([]);
  const [showPassage, setShowPassage] = useState(true);
  const [readingTime, setReadingTime] = useState(0);

  // Usage state
  const [usageItems, setUsageItems] = useState<UsageItem[]>([]);
  const [currentUsageItem, setCurrentUsageItem] = useState(0);
  const [usageAnswers, setUsageAnswers] = useState<{ itemId: string; category: UsageCategory; correct: boolean; timeSpent: number }[]>([]);
  const [usageItemStart, setUsageItemStart] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);

  // Timer
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Initialize
  useEffect(() => {
    // Check if there's an incomplete diagnostic
    const latest = getLatestDiagnostic();
    if (latest && !latest.completedAt) {
      // Resume incomplete diagnostic
      setDiagnosticId(latest.id);
      // For simplicity, restart from beginning
    }

    // Select random passage
    const randomPassage = (seedPassages as ReadingPassage[])[Math.floor(Math.random() * seedPassages.length)];
    setPassage(randomPassage);

    // Select 15 random usage items, shuffled
    const shuffled = [...(seedUsageItems as UsageItem[])].sort(() => Math.random() - 0.5);
    setUsageItems(shuffled.slice(0, 15));
  }, []);

  // Timer effect
  useEffect(() => {
    if (phase === 'intro' || phase === 'complete') return;

    const interval = setInterval(() => {
      setTimeElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startDiagnostic = () => {
    const id = `diag-${Date.now()}`;
    setDiagnosticId(id);
    addDiagnostic({
      id,
      startedAt: new Date().toISOString(),
      reading: {
        passageId: passage?.id || '',
        wpm: 0,
        accuracy: 0,
        timeSpent: 0,
        answers: [],
      },
      usage: {
        items: [],
        categoryScores: {
          collocations: { correct: 0, total: 0 },
          prepositions: { correct: 0, total: 0 },
          register: { correct: 0, total: 0 },
          grammar_frames: { correct: 0, total: 0 },
          word_forms: { correct: 0, total: 0 },
        },
      },
      weaknesses: [],
    });

    setPhase('reading');
    setReadingStartTime(Date.now());
    setTimeElapsed(0);
  };

  const handleFinishReading = () => {
    const readTime = Date.now() - readingStartTime;
    setReadingTime(readTime);
    setShowPassage(false);
  };

  const handleReadingAnswer = (answer: string) => {
    if (!passage) return;

    const question = passage.questions[currentQuestion];
    const isCorrect = answer === question.correctAnswer;

    const newAnswer = {
      questionId: question.id,
      selected: answer,
      correct: isCorrect,
    };

    const updatedAnswers = [...readingAnswers, newAnswer];
    setReadingAnswers(updatedAnswers);

    if (currentQuestion < passage.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate reading stats
      const wpm = Math.round((passage.wordCount / (readingTime / 1000)) * 60);
      const accuracy = updatedAnswers.filter((a) => a.correct).length / updatedAnswers.length;

      // Move to usage phase
      setPhase('usage');
      setUsageItemStart(Date.now());
    }
  };

  const handleUsageAnswer = useCallback(() => {
    if (!selectedAnswer) return;

    const item = usageItems[currentUsageItem];
    const isCorrect = selectedAnswer === item.answer;
    const timeSpent = Date.now() - usageItemStart;

    const newAnswer = {
      itemId: item.id,
      category: item.category,
      correct: isCorrect,
      timeSpent,
    };

    const updatedAnswers = [...usageAnswers, newAnswer];
    setUsageAnswers(updatedAnswers);

    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setSelectedAnswer('');

      if (currentUsageItem < usageItems.length - 1) {
        setCurrentUsageItem(currentUsageItem + 1);
        setUsageItemStart(Date.now());
      } else {
        // Complete diagnostic
        finishDiagnostic(updatedAnswers);
      }
    }, 1500);
  }, [selectedAnswer, usageItems, currentUsageItem, usageItemStart, usageAnswers]);

  const finishDiagnostic = (finalUsageAnswers: typeof usageAnswers) => {
    if (!passage) return;

    // Calculate category scores
    const categoryScores: Record<UsageCategory, { correct: number; total: number }> = {
      collocations: { correct: 0, total: 0 },
      prepositions: { correct: 0, total: 0 },
      register: { correct: 0, total: 0 },
      grammar_frames: { correct: 0, total: 0 },
      word_forms: { correct: 0, total: 0 },
    };

    finalUsageAnswers.forEach((answer) => {
      categoryScores[answer.category].total++;
      if (answer.correct) {
        categoryScores[answer.category].correct++;
      }
    });

    // Find top 3 weaknesses
    const weaknesses = (Object.entries(categoryScores) as [UsageCategory, { correct: number; total: number }][])
      .filter(([, data]) => data.total > 0)
      .sort((a, b) => {
        const aScore = a[1].correct / a[1].total;
        const bScore = b[1].correct / b[1].total;
        return aScore - bScore;
      })
      .slice(0, 3)
      .map(([category]) => category);

    const wpm = Math.round((passage.wordCount / (readingTime / 1000)) * 60);
    const accuracy = readingAnswers.filter((a) => a.correct).length / readingAnswers.length;

    const result: DiagnosticResult = {
      id: diagnosticId,
      startedAt: new Date(Date.now() - timeElapsed * 1000).toISOString(),
      completedAt: new Date().toISOString(),
      reading: {
        passageId: passage.id,
        wpm,
        accuracy,
        timeSpent: readingTime,
        answers: readingAnswers,
      },
      usage: {
        items: finalUsageAnswers,
        categoryScores,
      },
      weaknesses,
    };

    updateDiagnostic(diagnosticId, result);
    setPhase('complete');
  };

  // Intro phase
  if (phase === 'intro') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Vocabulary Usage Diagnostic
              </h1>
              <p className="text-gray-600">
                This 6-8 minute test will identify your vocabulary usage gaps.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Reading Comprehension</h3>
                  <p className="text-sm text-gray-600">
                    Read a short academic passage and answer 6 questions. We'll measure your reading speed and accuracy.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Usage Scan</h3>
                  <p className="text-sm text-gray-600">
                    Answer 15 quick questions testing collocations, prepositions, register, and grammar patterns.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Score Leak Report</h3>
                  <p className="text-sm text-gray-600">
                    Get a personalized report showing your top weaknesses and a plan to fix them.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={startDiagnostic}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Start Diagnostic
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reading phase
  if (phase === 'reading' && passage) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Progress bar */}
        <div className="fixed top-16 left-0 right-0 bg-white border-b z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600">Reading</span>
              <div className="w-32 h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{
                    width: showPassage
                      ? '0%'
                      : `${((currentQuestion + 1) / passage.questions.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <div className="text-sm font-mono text-gray-600">{formatTime(timeElapsed)}</div>
          </div>
        </div>

        <div className="pt-28 pb-12 px-4">
          <div className="max-w-4xl mx-auto">
            {showPassage ? (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {passage.title}
                </h2>
                <div className="prose prose-gray max-w-none mb-8">
                  {passage.content.split('\n\n').map((para, i) => (
                    <p key={i} className="text-gray-700 leading-relaxed mb-4">
                      {para}
                    </p>
                  ))}
                </div>
                <button
                  onClick={handleFinishReading}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  I've finished reading - Start questions
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-8">
                <div className="mb-6">
                  <span className="text-sm text-gray-500">
                    Question {currentQuestion + 1} of {passage.questions.length}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">
                  {passage.questions[currentQuestion].question}
                </h3>
                <div className="space-y-3">
                  {passage.questions[currentQuestion].choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => handleReadingAnswer(choice)}
                      className="w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Usage phase
  if (phase === 'usage' && usageItems.length > 0) {
    const item = usageItems[currentUsageItem];
    const isCorrect = selectedAnswer === item.answer;

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Progress bar */}
        <div className="fixed top-16 left-0 right-0 bg-white border-b z-40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600">Usage Scan</span>
              <div className="w-32 h-2 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{
                    width: `${((currentUsageItem + 1) / usageItems.length) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm text-gray-500">
                {currentUsageItem + 1}/{usageItems.length}
              </span>
            </div>
            <div className="text-sm font-mono text-gray-600">{formatTime(timeElapsed)}</div>
          </div>
        </div>

        <div className="pt-28 pb-12 px-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="mb-2">
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  {item.category.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-6">{item.prompt}</h3>

              <div className="space-y-3">
                {item.choices.map((choice, index) => {
                  let buttonClass =
                    'w-full text-left p-4 rounded-xl border-2 transition-all ';

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

              {showFeedback && (
                <div
                  className={`mt-6 p-4 rounded-xl ${
                    isCorrect ? 'bg-green-50' : 'bg-amber-50'
                  }`}
                >
                  <p
                    className={`font-medium ${isCorrect ? 'text-green-700' : 'text-amber-700'}`}
                  >
                    {isCorrect ? 'Correct!' : `The answer is: ${item.answer}`}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{item.explanation}</p>
                </div>
              )}

              {!showFeedback && selectedAnswer && (
                <button
                  onClick={handleUsageAnswer}
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
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Diagnostic Complete!</h1>
            <p className="text-gray-600 mb-6">
              Time: {formatTime(timeElapsed)}
            </p>
            <button
              onClick={() => router.push('/report')}
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              View Your Score Leak Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
