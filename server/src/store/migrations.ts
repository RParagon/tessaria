// Migrações do PostgreSQL, em ordem. Nunca edite uma já publicada: crie a próxima.
// Cada uma roda numa transação e fica registrada em schema_migrations.
export const MIGRATIONS: Array<{ id: string; sql: string }> = [
  { id: '001_inicial', sql: `
-- Fios de Tessária · esquema inicial (Fase 1)

CREATE TABLE IF NOT EXISTS accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  email       text,
  pass_hash   text,
  google_sub  text,
  guest       boolean NOT NULL DEFAULT false,
  banned      boolean NOT NULL DEFAULT false,
  muted_until timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_seen   timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_name_lower ON accounts (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_lower ON accounts (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_google ON accounts (google_sub) WHERE google_sub IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  text PRIMARY KEY,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  ua          text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS sessions_account ON sessions (account_id);

CREATE TABLE IF NOT EXISTS saves (
  account_id  uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  rev         integer NOT NULL,
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tombstones (
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, item_id)
);

CREATE TABLE IF NOT EXISTS mail (
  id          bigserial PRIMARY KEY,
  to_id       uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  from_id     uuid REFERENCES accounts(id) ON DELETE SET NULL,
  from_name   text NOT NULL,
  item        jsonb NOT NULL,
  note        text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  claimed_at  timestamptz
);
CREATE INDEX IF NOT EXISTS mail_to ON mail (to_id, claimed_at);

CREATE TABLE IF NOT EXISTS audit (
  id          bigserial PRIMARY KEY,
  account_id  uuid,
  kind        text NOT NULL,
  detail      jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_account ON audit (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS client_errors (
  id          bigserial PRIMARY KEY,
  account_id  uuid,
  version     text NOT NULL,
  message     text NOT NULL,
  stack       text NOT NULL DEFAULT '',
  ua          text NOT NULL DEFAULT '',
  url         text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_log (
  id          bigserial PRIMARY KEY,
  account_id  uuid NOT NULL,
  room        text NOT NULL,
  text        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_log_time ON chat_log (created_at DESC);
` },
  { id: '002_amigos', sql: `
-- Fase 2.1 · amigos e bloqueios (ver docs/ONLINE.md)
-- Uma linha por sentido. Pedido: (de, para, accepted=false). Amizade: as duas linhas com accepted=true.
CREATE TABLE IF NOT EXISTS friends (
  from_id     uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_id       uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  accepted    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (from_id, to_id)
);
CREATE INDEX IF NOT EXISTS friends_to ON friends (to_id);

CREATE TABLE IF NOT EXISTS blocks (
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS blocks_blocked ON blocks (blocked_id);
` },
  { id: '003_itens_concedidos', sql: `
-- Fase 2.2d · itens sorteados pelo servidor (loot da Fenda do grupo). Um item com g=1 no save
-- só é aceito se estiver aqui; a conta registrada é a que recebeu (o item pode ir adiante pelo correio).
CREATE TABLE IF NOT EXISTS item_grants (
  item_id     text PRIMARY KEY,
  account_id  uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS item_grants_account ON item_grants(account_id);
` },
];
