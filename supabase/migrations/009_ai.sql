-- =========================================================
-- AI SOHBET
-- =========================================================
CREATE TABLE conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent         agent_type NOT NULL DEFAULT 'coach',
  title         text,                       -- ilk mesajdan AI ile üretilir
  summary       text,                       -- uzun sohbetlerde bağlam sıkıştırma
  last_message_at timestamptz NOT NULL DEFAULT now(),
  is_archived   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX conversations_user_idx ON conversations(user_id, last_message_at DESC)
  WHERE NOT is_archived;

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role            message_role NOT NULL,
  -- Claude API content block dizisi olarak sakla; text + tool_use + tool_result
  content         jsonb NOT NULL,
  -- hızlı görüntüleme için düz metin kopyası
  text_content    text,
  model           text,
  input_tokens    integer,
  output_tokens   integer,
  stop_reason     text,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conv_idx ON messages(conversation_id, created_at);

CREATE TABLE message_tool_calls (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  tool_name     text NOT NULL,
  tool_use_id   text NOT NULL,
  input         jsonb NOT NULL,
  output        jsonb,
  duration_ms   integer,
  is_error      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('weekly','monthly','program_review','deload_suggestion')),
  period_start date NOT NULL,
  period_end   date NOT NULL,
  content_md   text NOT NULL,
  metrics      jsonb,             -- raporun dayandığı ham sayılar
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_usage_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent         agent_type NOT NULL,
  model         text,
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd      numeric(10,6),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_usage_user_day_idx ON ai_usage_log(user_id, created_at DESC);
