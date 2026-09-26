CREATE TABLE IF NOT EXISTS workspace_members (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','member')),
  code_hash TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES workspace_members(email) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS workspace_sessions_expiry ON workspace_sessions(expires_at);

CREATE TABLE IF NOT EXISTS workspace_prospects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  industry TEXT,
  location TEXT,
  source TEXT,
  stage TEXT NOT NULL DEFAULT 'research',
  notes TEXT NOT NULL DEFAULT '',
  owner_email TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS workspace_prospects_stage ON workspace_prospects(stage);

CREATE TABLE IF NOT EXISTS workspace_drafts (
  id TEXT PRIMARY KEY,
  prospect_id TEXT NOT NULL REFERENCES workspace_prospects(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','archived')),
  created_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS workspace_drafts_prospect ON workspace_drafts(prospect_id);

CREATE TABLE IF NOT EXISTS workspace_checkins (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL REFERENCES workspace_members(email),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS workspace_checkins_created ON workspace_checkins(created_at DESC);

CREATE TABLE IF NOT EXISTS workspace_creative (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  source_url TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL REFERENCES workspace_members(email),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS workspace_creative_created ON workspace_creative(created_at DESC);

