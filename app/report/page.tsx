'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getLatestDiagnostic, getEntitlement } from '@/lib/storage';
import type { DiagnosticResult, Entitlement } from '@/lib/types';
import type { UsageCategory } from '@/lib/constants';

const CATEGORY_LABELS: Record<UsageCategory, string> = {
  collocations: 'Collocations',
  prepositions: 'Prepositions',
  register: 'Register & Formality',
  grammar_frames: 'Grammar Frames',
  word_forms: 'Word Forms',
};

const CATEGORY_TIPS: Record<UsageCategory, string> = {
  collocations: 'Focus on learning words in natural combinations rather than isolation.',
  prepositions: 'Memorize verb + preposition combinations as fixed phrases.',
  register: 'Practice distinguishing formal academic language from informal speech.',
  grammar_frames: 'Learn common patterns like "verb + gerund" vs "verb + infinitive".',
  word_forms: 'Study word families and practice using correct parts of speech.',
};

export default function ReportPage() {
  const router = useRouter();
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement>({ tier: 'free', active: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const latestDiagnostic = getLatestDiagnostic();
    const currentEntitlement = getEntitlement();

    if (!latestDiagnostic?.completedAt) {
      router.push('/diagnostic');
      return;
    }

    setDiagnostic(latestDiagnostic);
    setEntitlement(currentEntitlement);
    setLoading(false);
  }, [router]);

  if (loading || !diagnostic) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { reading, usage, weaknesses } = diagnostic;
  const totalUsageItems = Object.values(usage.categoryScores).reduce((sum, cat) => sum + cat.total, 0);
  const totalUsageCorrect = Object.values(usage.categoryScores).reduce((sum, cat) => sum + cat.correct, 0);
  const usageAccuracy = totalUsageItems > 0 ? Math.round((totalUsageCorrect / totalUsageItems) * 100) : 0;
  const readingAccuracy = Math.round(reading.accuracy * 100);

  // Overall score (weighted)
  const overallScore = Math.round(readingAccuracy * 0.3 + usageAccuracy * 0.7);

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Score Leak Report
          </h1>
          <p className="text-gray-600">
            Here's where you're losing points and how to fix it.
          </p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <h2 className="text-lg font-medium text-gray-600 mb-1">Overall Readiness</h2>
              <div className={`text-5xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}%
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{reading.wpm}</div>
                <div className="text-sm text-gray-500">WPM</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{readingAccuracy}%</div>
                <div className="text-sm text-gray-500">Reading Acc.</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{usageAccuracy}%</div>
                <div className="text-sm text-gray-500">Usage Acc.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Weaknesses */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Top Score Leaks
          </h2>

          {weaknesses.length > 0 ? (
            <div className="space-y-4">
              {weaknesses.map((category, index) => {
                const catScore = usage.categoryScores[category];
                const accuracy = catScore.total > 0
                  ? Math.round((catScore.correct / catScore.total) * 100)
                  : 0;
                const errorCount = catScore.total - catScore.correct;

                return (
                  <div
                    key={category}
                    className={`p-4 rounded-xl border-2 ${
                      index === 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs font-medium text-gray-500">
                          {index === 0 ? 'BIGGEST LEAK' : `LEAK #${index + 1}`}
                        </span>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {CATEGORY_LABELS[category]}
                        </h3>
                      </div>
                      <div className={`px-3 py-1 rounded-full ${getScoreBg(accuracy)}`}>
                        <span className={`font-semibold ${getScoreColor(accuracy)}`}>
                          {accuracy}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {errorCount} error{errorCount !== 1 ? 's' : ''} out of {catScore.total} questions
                    </p>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded-lg">
                      <strong>Fix tip:</strong> {CATEGORY_TIPS[category]}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600">Great job! No major weaknesses detected.</p>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Category Breakdown
          </h2>
          <div className="space-y-4">
            {(Object.entries(usage.categoryScores) as [UsageCategory, { correct: number; total: number }][]).map(
              ([category, data]) => {
                const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {CATEGORY_LABELS[category]}
                      </span>
                      <span className={`text-sm font-semibold ${getScoreColor(accuracy)}`}>
                        {data.correct}/{data.total} ({accuracy}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          accuracy >= 80
                            ? 'bg-green-500'
                            : accuracy >= 60
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Free Practice CTA */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 mb-6 text-white">
          <h2 className="text-2xl font-bold mb-2">Fix Your Weakest Area Now</h2>
          <p className="text-blue-100 mb-6">
            Get 1 free personalized drill session targeting your biggest weakness:{' '}
            <strong>{CATEGORY_LABELS[weaknesses[0] || 'collocations']}</strong>
          </p>
          <Link
            href={`/drill?focus=${weaknesses[0] || 'collocations'}`}
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors"
          >
            Start Free Fix Drill
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* Upgrade CTA */}
        {entitlement.tier === 'free' && (
          <div className="bg-white rounded-2xl shadow-sm p-8 border-2 border-dashed border-gray-200">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Unlock Your Full Fix Plan
              </h2>
              <p className="text-gray-600 mb-6">
                Get unlimited adaptive drills, detailed progress tracking, and personalized study plans.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
              >
                View Upgrade Options
              </Link>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-center gap-4 mt-8">
          <Link
            href="/diagnostic"
            className="px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Retake Diagnostic
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
