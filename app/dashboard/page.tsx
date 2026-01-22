'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProgress, getSessions, getLatestDiagnostic, getProfile, initializeProgress } from '@/lib/storage';
import { calculateExamReadiness, getTopWeaknesses } from '@/lib/adaptive';
import type { UserProgress, DrillSession, DiagnosticResult, UserProfile } from '@/lib/types';
import type { UsageCategory } from '@/lib/constants';

const CATEGORY_LABELS: Record<UsageCategory, string> = {
  collocations: 'Collocations',
  prepositions: 'Prepositions',
  register: 'Register',
  grammar_frames: 'Grammar Frames',
  word_forms: 'Word Forms',
};

export default function DashboardPage() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [sessions, setSessions] = useState<DrillSession[]>([]);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedProgress = getProgress() || initializeProgress();
    const storedSessions = getSessions();
    const latestDiagnostic = getLatestDiagnostic();
    const storedProfile = getProfile();

    setProgress(storedProgress);
    setSessions(storedSessions);
    setDiagnostic(latestDiagnostic);
    setProfile(storedProfile);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const examReadiness = calculateExamReadiness(diagnostic, sessions.slice(-10));
  const topWeaknesses = getTopWeaknesses(diagnostic, sessions.slice(-10), 3);
  const recentSessions = sessions.slice(-5).reverse();

  // Calculate trends
  const getRecentAccuracy = () => {
    if (sessions.length === 0) return null;
    const recent = sessions.slice(-5);
    const totalAccuracy = recent.reduce((sum, s) => sum + (s.results?.accuracy || 0), 0);
    return Math.round((totalAccuracy / recent.length) * 100);
  };

  const getTotalPracticeTime = () => {
    if (!progress) return '0m';
    const minutes = Math.floor(progress.totalDrillTime / 60);
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }
    return `${minutes}m`;
  };

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

  const recentAccuracy = getRecentAccuracy();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Progress</h1>
          <p className="text-gray-600">
            {profile?.examType
              ? `Preparing for ${profile.examType}${profile.examDate ? ` on ${new Date(profile.examDate).toLocaleDateString()}` : ''}`
              : 'Track your vocabulary usage improvement'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Exam Readiness</div>
            <div className={`text-3xl font-bold ${getScoreColor(examReadiness)}`}>
              {examReadiness}%
            </div>
            <div className="mt-2 w-full h-2 bg-gray-200 rounded-full">
              <div
                className={`h-full rounded-full ${
                  examReadiness >= 80 ? 'bg-green-500' : examReadiness >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${examReadiness}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Recent Accuracy</div>
            <div className={`text-3xl font-bold ${recentAccuracy !== null ? getScoreColor(recentAccuracy) : 'text-gray-400'}`}>
              {recentAccuracy !== null ? `${recentAccuracy}%` : '--'}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Last 5 sessions
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Drills Completed</div>
            <div className="text-3xl font-bold text-gray-900">
              {progress?.drillsCompleted || 0}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Total sessions
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="text-sm text-gray-500 mb-1">Practice Time</div>
            <div className="text-3xl font-bold text-gray-900">
              {getTotalPracticeTime()}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              Total time
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Diagnostic Summary */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Latest Diagnostic</h2>
              <Link
                href="/diagnostic"
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {diagnostic ? 'Retake' : 'Take now'}
              </Link>
            </div>

            {diagnostic?.completedAt ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Reading WPM</div>
                    <div className="text-2xl font-bold text-gray-900">{diagnostic.reading.wpm}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-500">Reading Accuracy</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.round(diagnostic.reading.accuracy * 100)}%
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-2">Top Weaknesses</div>
                  <div className="flex flex-wrap gap-2">
                    {diagnostic.weaknesses.map((weakness) => (
                      <span
                        key={weakness}
                        className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm"
                      >
                        {CATEGORY_LABELS[weakness]}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href="/report"
                  className="block text-center py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  View Full Report
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-4">Take a diagnostic to identify your weak areas</p>
                <Link
                  href="/diagnostic"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  Start Diagnostic
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            )}
          </div>

          {/* Category Performance */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h2>

            {progress && Object.keys(progress.usageAccuracy).some(
              (cat) => progress.usageAccuracy[cat as UsageCategory].length > 0
            ) ? (
              <div className="space-y-4">
                {(Object.entries(progress.usageAccuracy) as [UsageCategory, { date: string; accuracy: number }[]][]).map(
                  ([category, history]) => {
                    const recent = history.slice(-5);
                    const avgAccuracy = recent.length > 0
                      ? Math.round((recent.reduce((sum, h) => sum + h.accuracy, 0) / recent.length) * 100)
                      : null;

                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {CATEGORY_LABELS[category]}
                          </span>
                          <span className={`text-sm font-semibold ${avgAccuracy !== null ? getScoreColor(avgAccuracy) : 'text-gray-400'}`}>
                            {avgAccuracy !== null ? `${avgAccuracy}%` : '--'}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          {avgAccuracy !== null && (
                            <div
                              className={`h-full rounded-full transition-all ${
                                avgAccuracy >= 80 ? 'bg-green-500' : avgAccuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${avgAccuracy}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Complete some drills to see your category performance</p>
                <Link
                  href="/drill"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                >
                  Start Practice
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Sessions */}
        <div className="mt-8 bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
            <Link
              href="/drill"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Practice now
            </Link>
          </div>

          {recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {session.mode === 'focused' ? 'Focused Drill' : 'Adaptive Drill'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(session.createdAt).toLocaleDateString()} • {Math.floor(session.durationSec / 60)}m
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${getScoreColor(Math.round((session.results?.accuracy || 0) * 100))}`}>
                      {Math.round((session.results?.accuracy || 0) * 100)}%
                    </div>
                    <div className="text-sm text-gray-500">
                      {session.results?.correct}/{session.results?.totalItems} correct
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No practice sessions yet</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        {topWeaknesses.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-2">Recommended Practice</h2>
            <p className="text-blue-100 mb-4">
              Focus on your weakest area to improve fastest
            </p>
            <Link
              href={`/drill?focus=${topWeaknesses[0]}`}
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Practice {CATEGORY_LABELS[topWeaknesses[0]]}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
