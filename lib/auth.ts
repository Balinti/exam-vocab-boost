'use client';

import { SHARED_SUPABASE_URL, SHARED_SUPABASE_ANON_KEY, APP_SLUG } from './constants';

// Auth user type
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

// Auth session type
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

// Global auth state (exposed on window for cross-component access)
declare global {
  interface Window {
    AUTH_USER: AuthUser | null;
    AUTH_SESSION: AuthSession | null;
    SUPABASE_CLIENT: SupabaseClient | null;
  }
}

interface QueryBuilder {
  eq: (column: string, value: string) => QueryBuilder;
  single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
}

interface SupabaseClient {
  auth: {
    getSession: () => Promise<{ data: { session: AuthSession | null } }>;
    getUser: () => Promise<{ data: { user: SupabaseUser | null } }>;
    signInWithOAuth: (options: { provider: string; options?: { redirectTo?: string } }) => Promise<{ error: Error | null }>;
    signOut: () => Promise<{ error: Error | null }>;
    onAuthStateChange: (callback: (event: string, session: AuthSession | null) => void) => { data: { subscription: { unsubscribe: () => void } } };
  };
  from: (table: string) => {
    upsert: (data: Record<string, unknown>, options?: { onConflict?: string }) => Promise<{ error: Error | null }>;
    select: (columns?: string) => QueryBuilder;
  };
}

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
}

let supabaseClient: SupabaseClient | null = null;
let authInitialized = false;
let authListeners: ((user: AuthUser | null) => void)[] = [];

// Dynamically load Supabase client from CDN
async function loadSupabaseClient(): Promise<SupabaseClient | null> {
  if (typeof window === 'undefined') return null;
  if (supabaseClient) return supabaseClient;

  return new Promise((resolve) => {
    // Check if already loaded
    if ((window as unknown as { supabase?: { createClient: (url: string, key: string) => SupabaseClient } }).supabase) {
      const client = (window as unknown as { supabase: { createClient: (url: string, key: string) => SupabaseClient } }).supabase.createClient(
        SHARED_SUPABASE_URL,
        SHARED_SUPABASE_ANON_KEY
      );
      supabaseClient = client;
      window.SUPABASE_CLIENT = client;
      resolve(client);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.async = true;
    script.onload = () => {
      const client = (window as unknown as { supabase: { createClient: (url: string, key: string) => SupabaseClient } }).supabase.createClient(
        SHARED_SUPABASE_URL,
        SHARED_SUPABASE_ANON_KEY
      );
      supabaseClient = client;
      window.SUPABASE_CLIENT = client;
      resolve(client);
    };
    script.onerror = () => {
      console.error('Failed to load Supabase client');
      resolve(null);
    };
    document.head.appendChild(script);
  });
}

// Track user login to shared user_tracking table
async function trackUserLogin(userId: string, email: string): Promise<void> {
  const client = await loadSupabaseClient();
  if (!client) return;

  try {
    // First try to get existing record
    const { data: existing } = await client
      .from('user_tracking')
      .select('login_cnt')
      .eq('user_id', userId)
      .eq('app', APP_SLUG)
      .single();

    const loginCount = existing ? (existing.login_cnt as number) + 1 : 1;

    await client.from('user_tracking').upsert(
      {
        user_id: userId,
        app: APP_SLUG,
        email: email,
        login_cnt: loginCount,
        last_login_ts: new Date().toISOString(),
      },
      { onConflict: 'user_id,app' }
    );
  } catch (error) {
    console.error('Error tracking user login:', error);
  }
}

// Convert Supabase user to our AuthUser type
function toAuthUser(user: SupabaseUser | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata?.full_name || user.user_metadata?.name,
    avatarUrl: user.user_metadata?.avatar_url,
  };
}

// Initialize auth and set up listeners
export async function initializeAuth(): Promise<AuthUser | null> {
  if (typeof window === 'undefined') return null;
  if (authInitialized) return window.AUTH_USER;

  const client = await loadSupabaseClient();
  if (!client) return null;

  // Get initial session
  const { data: { session } } = await client.auth.getSession();
  const { data: { user } } = await client.auth.getUser();

  const authUser = toAuthUser(user);
  window.AUTH_USER = authUser;
  window.AUTH_SESSION = session;

  // Set up auth state change listener
  client.auth.onAuthStateChange(async (event, session) => {
    window.AUTH_SESSION = session;

    if (event === 'SIGNED_IN' && session) {
      const { data: { user } } = await client.auth.getUser();
      const authUser = toAuthUser(user);
      window.AUTH_USER = authUser;

      if (authUser) {
        await trackUserLogin(authUser.id, authUser.email);
      }

      authListeners.forEach(listener => listener(authUser));
    } else if (event === 'SIGNED_OUT') {
      window.AUTH_USER = null;
      authListeners.forEach(listener => listener(null));
    }
  });

  authInitialized = true;
  return authUser;
}

// Sign in with Google
export async function signInWithGoogle(): Promise<void> {
  const client = await loadSupabaseClient();
  if (!client) {
    console.error('Supabase client not loaded');
    return;
  }

  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/`
    : undefined;

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });

  if (error) {
    console.error('Error signing in:', error);
  }
}

// Sign out
export async function signOut(): Promise<void> {
  const client = await loadSupabaseClient();
  if (!client) return;

  const { error } = await client.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
  }

  window.AUTH_USER = null;
  window.AUTH_SESSION = null;
}

// Get current user
export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  return window.AUTH_USER;
}

// Get current session
export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  return window.AUTH_SESSION;
}

// Subscribe to auth changes
export function onAuthChange(callback: (user: AuthUser | null) => void): () => void {
  authListeners.push(callback);
  return () => {
    authListeners = authListeners.filter(l => l !== callback);
  };
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getCurrentUser();
}
