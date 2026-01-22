'use client';

import { useState, useEffect } from 'react';
import { hasMeaningfulEngagement, exportAllData } from '@/lib/storage';
import { getCurrentUser, isAuthenticated, signInWithGoogle } from '@/lib/auth';

interface SyncPromptProps {
  onDismiss?: () => void;
}

export default function SyncPrompt({ onDismiss }: SyncPromptProps) {
  const [show, setShow] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  useEffect(() => {
    // Check if user has engagement and is not logged in
    const checkEngagement = () => {
      if (hasMeaningfulEngagement() && !isAuthenticated()) {
        // Delay showing the prompt
        setTimeout(() => setShow(true), 2000);
      }
    };

    checkEngagement();
  }, []);

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  const handleSync = async () => {
    const user = getCurrentUser();
    if (!user) return;

    setSyncing(true);

    try {
      const data = exportAllData();
      const session = window.AUTH_SESSION;

      if (!session?.access_token) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ data }),
      });

      if (response.ok) {
        setSyncComplete(true);
        setTimeout(() => {
          setShow(false);
          onDismiss?.();
        }, 2000);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    onDismiss?.();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        {syncComplete ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Progress Synced!</h3>
            <p className="text-gray-600">Your progress is now saved to the cloud.</p>
          </div>
        ) : isAuthenticated() ? (
          <>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sync your progress?
            </h3>
            <p className="text-gray-600 mb-6">
              Save your diagnostic results and practice sessions to your account so you can access them from any device.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {syncing ? 'Syncing...' : 'Sync now'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
              Save your progress
            </h3>
            <p className="text-gray-600 mb-6 text-center">
              Create a free account to save your diagnostic results and practice history across devices.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleSignIn}
                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
              <button
                onClick={handleDismiss}
                className="w-full px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
              >
                Maybe later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
