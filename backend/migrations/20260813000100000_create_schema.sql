-- up migration
--
-- Initial schema: users, tournaments, registrations (the join table between
-- them). CHECK constraints are used instead of native Postgres enums for
-- role/status so adding a new value later is a plain migration instead of
-- an `ALTER TYPE`. See README's "Database" section for the full rationale.

-- gen_random_uuid() (used as every table's primary key default) lives in
-- this extension.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'USER',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_key UNIQUE (email),
  -- Emails are always stored lowercase (see authValidators' .transform),
  -- and this constraint makes that invariant enforced by the database
  -- itself, not just by application code.
  CONSTRAINT users_email_lowercase_check CHECK (email = lower(email)),
  CONSTRAINT users_role_check CHECK (role IN ('USER', 'ADMIN'))
);

CREATE TABLE tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  max_players integer NOT NULL,
  starts_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tournaments_max_players_check CHECK (max_players > 0),
  CONSTRAINT tournaments_status_check CHECK (status IN ('OPEN', 'CLOSED', 'COMPLETED'))
);

-- The many-to-many join table between users and tournaments. There is no
-- `registered_count` column anywhere — it is always computed with
-- COUNT(*) at query time (see tournamentService.ts) so it can never drift
-- out of sync with the actual rows here.
CREATE TABLE registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ON DELETE CASCADE: if a user or tournament is ever deleted, their
  -- registrations are cleaned up automatically rather than becoming
  -- orphaned foreign keys.
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Enforces "one registration per user per tournament" at the database
  -- level — the source of truth for ALREADY_REGISTERED, not an
  -- application-level pre-check (see registrationService.ts).
  CONSTRAINT registrations_user_tournament_unique UNIQUE (user_id, tournament_id)
);

-- Speeds up the two hot lookups on this table: counting/listing
-- registrations for one tournament (capacity checks, admin roster) and the
-- FOR UPDATE row lock's supporting queries.
CREATE INDEX registrations_tournament_id_idx ON registrations(tournament_id);
