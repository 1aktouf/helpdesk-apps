-- Runs once, when the Postgres volume is first created (docker-entrypoint-initdb.d).
-- shortcut: no migration tool; to apply schema changes run `docker compose down -v` (wipes data). Add a migration tool if we ever need to keep data.

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(254) NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE tickets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     VARCHAR(120) NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('technical', 'billing', 'account', 'other')),
  priority    TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  description VARCHAR(2000) NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX tickets_user_id_idx ON tickets (user_id);

CREATE TABLE ticket_comments (
  id         SERIAL PRIMARY KEY,
  ticket_id  INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ticket_comments_ticket_id_idx ON ticket_comments (ticket_id);

-- Session store used by connect-pg-simple (its documented table layout).
CREATE TABLE session (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX session_expire_idx ON session (expire);
