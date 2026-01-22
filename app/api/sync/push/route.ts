import { NextRequest, NextResponse } from 'next/server';

// Shared Supabase auth credentials
const SHARED_SUPABASE_URL = 'https://api.srv936332.hstgr.cloud';
const SHARED_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzM2NjIyNDAwLAogICJleHAiOiAxODk0Mzg4ODAwCn0.FyT4wqGqgkMOlnPr-W4I3xZcvPsOsqdMqOgflJhdBWo';

interface AuthUser {
  id: string;
  email: string;
}

async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${SHARED_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SHARED_SUPABASE_ANON_KEY,
      },
    });

    if (!response.ok) {
      return null;
    }

    const userData = await response.json();
    return {
      id: userData.id,
      email: userData.email,
    };
  } catch (err) {
    console.error('Token verification error:', err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get and verify authorization token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const user = await verifyToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get data to sync
    const body = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    // Get app-specific Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const now = new Date().toISOString();

    // Store in cloud_kv table
    const kvData = {
      user_id: user.id,
      key: 'local_data',
      value: data,
      updated_at: now,
    };

    const kvResponse = await fetch(`${supabaseUrl}/rest/v1/cloud_kv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(kvData),
    });

    if (!kvResponse.ok) {
      const errorText = await kvResponse.text();
      console.error('KV store error:', errorText);
    }

    // Also normalize data into proper tables
    // 1. Profile
    if (data.profile) {
      const profileData = {
        user_id: user.id,
        exam_type: data.profile.examType,
        exam_date: data.profile.examDate,
        target_score: data.profile.targetScore,
        l1: data.profile.l1,
        level_estimate: data.profile.levelEstimate,
        updated_at: now,
      };

      await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify(profileData),
      });
    }

    // 2. Diagnostics
    if (data.diagnostics && Array.isArray(data.diagnostics)) {
      for (const diagnostic of data.diagnostics) {
        const diagData = {
          id: diagnostic.id,
          user_id: user.id,
          started_at: diagnostic.startedAt,
          completed_at: diagnostic.completedAt,
          results: diagnostic,
        };

        await fetch(`${supabaseUrl}/rest/v1/diagnostic_attempts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify(diagData),
        });
      }
    }

    // 3. Sessions
    if (data.sessions && Array.isArray(data.sessions)) {
      for (const session of data.sessions) {
        const sessionData = {
          id: session.id,
          user_id: user.id,
          created_at: session.createdAt,
          mode: session.mode,
          duration_sec: session.durationSec,
          results: session.results,
        };

        await fetch(`${supabaseUrl}/rest/v1/drill_sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify(sessionData),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sync push error:', error);
    return NextResponse.json(
      { error: 'Failed to sync data' },
      { status: 500 }
    );
  }
}
