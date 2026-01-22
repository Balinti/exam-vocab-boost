-- Row Level Security Policies for Exam Vocab Boost
-- Enable RLS on all tables

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_bundle_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE cloud_kv ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own profile
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_delete_own ON profiles;
CREATE POLICY profiles_delete_own ON profiles
  FOR DELETE USING (user_id = auth.uid());

-- Usage bundles: public read access (for anonymous users too)
DROP POLICY IF EXISTS usage_bundles_select_all ON usage_bundles;
CREATE POLICY usage_bundles_select_all ON usage_bundles
  FOR SELECT USING (true);

-- Bundle items: public read access
DROP POLICY IF EXISTS bundle_items_select_all ON bundle_items;
CREATE POLICY bundle_items_select_all ON bundle_items
  FOR SELECT USING (true);

-- Diagnostic attempts: users can only access their own
DROP POLICY IF EXISTS diagnostic_attempts_select_own ON diagnostic_attempts;
CREATE POLICY diagnostic_attempts_select_own ON diagnostic_attempts
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS diagnostic_attempts_insert_own ON diagnostic_attempts;
CREATE POLICY diagnostic_attempts_insert_own ON diagnostic_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS diagnostic_attempts_update_own ON diagnostic_attempts;
CREATE POLICY diagnostic_attempts_update_own ON diagnostic_attempts
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS diagnostic_attempts_delete_own ON diagnostic_attempts;
CREATE POLICY diagnostic_attempts_delete_own ON diagnostic_attempts
  FOR DELETE USING (user_id = auth.uid());

-- Drill sessions: users can only access their own
DROP POLICY IF EXISTS drill_sessions_select_own ON drill_sessions;
CREATE POLICY drill_sessions_select_own ON drill_sessions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS drill_sessions_insert_own ON drill_sessions;
CREATE POLICY drill_sessions_insert_own ON drill_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS drill_sessions_update_own ON drill_sessions;
CREATE POLICY drill_sessions_update_own ON drill_sessions
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS drill_sessions_delete_own ON drill_sessions;
CREATE POLICY drill_sessions_delete_own ON drill_sessions
  FOR DELETE USING (user_id = auth.uid());

-- User bundle state: users can only access their own
DROP POLICY IF EXISTS user_bundle_state_select_own ON user_bundle_state;
CREATE POLICY user_bundle_state_select_own ON user_bundle_state
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_bundle_state_insert_own ON user_bundle_state;
CREATE POLICY user_bundle_state_insert_own ON user_bundle_state
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_bundle_state_update_own ON user_bundle_state;
CREATE POLICY user_bundle_state_update_own ON user_bundle_state
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_bundle_state_delete_own ON user_bundle_state;
CREATE POLICY user_bundle_state_delete_own ON user_bundle_state
  FOR DELETE USING (user_id = auth.uid());

-- Entitlements: users can only access their own
DROP POLICY IF EXISTS entitlements_select_own ON entitlements;
CREATE POLICY entitlements_select_own ON entitlements
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS entitlements_insert_own ON entitlements;
CREATE POLICY entitlements_insert_own ON entitlements
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS entitlements_update_own ON entitlements;
CREATE POLICY entitlements_update_own ON entitlements
  FOR UPDATE USING (user_id = auth.uid());

-- Cloud KV: users can only access their own
DROP POLICY IF EXISTS cloud_kv_select_own ON cloud_kv;
CREATE POLICY cloud_kv_select_own ON cloud_kv
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS cloud_kv_insert_own ON cloud_kv;
CREATE POLICY cloud_kv_insert_own ON cloud_kv
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS cloud_kv_update_own ON cloud_kv;
CREATE POLICY cloud_kv_update_own ON cloud_kv
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS cloud_kv_delete_own ON cloud_kv;
CREATE POLICY cloud_kv_delete_own ON cloud_kv
  FOR DELETE USING (user_id = auth.uid());

-- Service role bypass for API routes
-- Note: Service role key bypasses RLS automatically
