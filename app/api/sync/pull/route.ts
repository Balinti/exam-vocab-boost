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

    // Get app-specific Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Fetch user's cloud data
    const data: Record<string, unknown> = {};

    // 1. Get from cloud_kv (full local data blob)
    const kvResponse = await fetch(
      `${supabaseUrl}/rest/v1/cloud_kv?user_id=eq.${user.id}&key=eq.local_data&select=value`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (kvResponse.ok) {
      const kvData = await kvResponse.json();
      if (kvData.length > 0 && kvData[0].value) {
        // Return the stored blob directly
        return NextResponse.json({
          success: true,
          data: kvData[0].value,
        });
      }
    }

    // 2. If no blob, fetch from normalized tables
    // Profile
    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?user_id=eq.${user.id}&select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (profileResponse.ok) {
      const profiles = await profileResponse.json();
      if (profiles.length > 0) {
        const p = profiles[0];
        data.profile = {
          examType: p.exam_type,
          examDate: p.exam_date,
          targetScore: p.target_score,
          l1: p.l1,
          levelEstimate: p.level_estimate,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        };
      }
    }

    // Diagnostics
    const diagResponse = await fetch(
      `${supabaseUrl}/rest/v1/diagnostic_attempts?user_id=eq.${user.id}&select=*&order=started_at.desc`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (diagResponse.ok) {
      const diagnostics = await diagResponse.json();
      data.diagnostics = diagnostics.map((d: Record<string, unknown>) => d.results || d);
    }

    // Sessions
    const sessionsResponse = await fetch(
      `${supabaseUrl}/rest/v1/drill_sessions?user_id=eq.${user.id}&select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (sessionsResponse.ok) {
      const sessions = await sessionsResponse.json();
      data.sessions = sessions.map((s: Record<string, unknown>) => ({
        id: s.id,
        createdAt: s.created_at,
        mode: s.mode,
        durationSec: s.duration_sec,
        results: s.results,
      }));
    }

    // Entitlements
    const entResponse = await fetch(
      `${supabaseUrl}/rest/v1/entitlements?user_id=eq.${user.id}&select=*`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (entResponse.ok) {
      const entitlements = await entResponse.json();
      if (entitlements.length > 0) {
        const e = entitlements[0];
        data.entitlement = {
          tier: e.tier,
          active: e.active,
          purchasedAt: e.purchased_at,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Sync pull error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}
