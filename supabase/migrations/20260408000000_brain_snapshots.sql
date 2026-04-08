-- =============================================================================
-- Brain Snapshots — stores versioned snapshots of compiled Chef Brain
-- =============================================================================

CREATE TABLE IF NOT EXISTS brain_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  prompt_text TEXT NOT NULL,
  compiled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_snapshots_user_id ON brain_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_brain_snapshots_user_version ON brain_snapshots(user_id, version DESC);

ALTER TABLE brain_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own snapshots"
  ON brain_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert snapshots"
  ON brain_snapshots FOR INSERT
  WITH CHECK (true);
