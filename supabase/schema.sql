-- Exam Vocab Boost Database Schema
-- This schema is for the app-specific Supabase instance

-- Profiles table (stores user preferences, exam info)
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY,
  exam_type TEXT,
  exam_date DATE,
  target_score TEXT,
  l1 TEXT,
  level_estimate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage bundles (groups of related vocabulary items)
CREATE TABLE IF NOT EXISTS usage_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_type TEXT,
  level TEXT,
  headword TEXT,
  tags TEXT[],
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bundle items (individual drill questions)
CREATE TABLE IF NOT EXISTS bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES usage_bundles(id) ON DELETE CASCADE,
  item_type TEXT,
  prompt TEXT,
  choices JSONB,
  answer JSONB,
  explanation TEXT,
  error_tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Diagnostic attempts (stores user diagnostic results)
CREATE TABLE IF NOT EXISTS diagnostic_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  results JSONB
);

-- Drill sessions (stores practice session results)
CREATE TABLE IF NOT EXISTS drill_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  mode TEXT,
  duration_sec INT,
  results JSONB
);

-- User bundle state (SRS state for each user-bundle pair)
CREATE TABLE IF NOT EXISTS user_bundle_state (
  user_id UUID,
  bundle_id UUID,
  ease REAL DEFAULT 2.5,
  interval_days INT DEFAULT 1,
  due_at TIMESTAMPTZ,
  last_result JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, bundle_id)
);

-- Entitlements (purchase status)
CREATE TABLE IF NOT EXISTS entitlements (
  user_id UUID PRIMARY KEY,
  tier TEXT,
  active BOOLEAN DEFAULT FALSE,
  purchased_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cloud KV (for syncing localStorage blobs)
CREATE TABLE IF NOT EXISTS cloud_kv (
  user_id UUID,
  key TEXT,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_diagnostic_attempts_user_id ON diagnostic_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_drill_sessions_user_id ON drill_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bundle_state_due_at ON user_bundle_state(due_at);
CREATE INDEX IF NOT EXISTS idx_usage_bundles_exam_type ON usage_bundles(exam_type);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id ON bundle_items(bundle_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_bundle_state_updated_at ON user_bundle_state;
CREATE TRIGGER update_user_bundle_state_updated_at
  BEFORE UPDATE ON user_bundle_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_entitlements_updated_at ON entitlements;
CREATE TRIGGER update_entitlements_updated_at
  BEFORE UPDATE ON entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cloud_kv_updated_at ON cloud_kv;
CREATE TRIGGER update_cloud_kv_updated_at
  BEFORE UPDATE ON cloud_kv
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
