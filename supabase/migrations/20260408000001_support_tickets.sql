-- Migration: support_tickets
-- Persists help desk tickets submitted by users.

CREATE TABLE IF NOT EXISTS support_tickets (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_number  TEXT        NOT NULL,
  subject        TEXT        NOT NULL,
  description    TEXT        NOT NULL,
  department     TEXT        NOT NULL DEFAULT 'General Support',
  priority       TEXT        NOT NULL DEFAULT 'Normal'
                             CHECK (priority IN ('Low', 'Normal', 'Urgent')),
  status         TEXT        NOT NULL DEFAULT 'Open'
                             CHECK (status IN ('Open', 'In Progress', 'Resolved')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate a human-readable ticket number before insert
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD((FLOOR(RANDOM() * 90000) + 10000)::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_ticket_number
  BEFORE INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins have full access
CREATE POLICY "Admins have full access to tickets"
  ON support_tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );
