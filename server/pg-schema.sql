-- Schéma PostgreSQL (Supabase self-hosted ou tout Postgres).
-- À appliquer au démarrage si DATABASE_URL est défini.

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_exp ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS pages (
  slug TEXT PRIMARY KEY,
  html_title TEXT NOT NULL,
  kicker TEXT NOT NULL,
  h1 TEXT NOT NULL,
  meta_updated TEXT,
  meta_editor TEXT,
  toc_html TEXT,
  content_html TEXT NOT NULL DEFAULT '',
  layout TEXT NOT NULL DEFAULT 'legal',
  main_html TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demo_requests (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  studio TEXT NOT NULL,
  telephone TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_kv (
  k TEXT PRIMARY KEY NOT NULL,
  v TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
