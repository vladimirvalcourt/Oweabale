-- Owe-AI: group messages into conversations (sessions).
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS session_id UUID;

CREATE INDEX IF NOT EXISTS chat_messages_user_mode_session_idx
  ON public.chat_messages (user_id, mode, session_id, created_at DESC);

-- One legacy session per (user_id, mode) for existing rows.
DO $$
DECLARE r RECORD;
  new_sid uuid;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id, mode FROM public.chat_messages WHERE session_id IS NULL
  LOOP
    new_sid := gen_random_uuid();
    UPDATE public.chat_messages
    SET session_id = new_sid
    WHERE user_id = r.user_id AND mode = r.mode AND session_id IS NULL;
  END LOOP;
END $$;

ALTER TABLE public.chat_messages
  ALTER COLUMN session_id SET DEFAULT gen_random_uuid();

-- New inserts should set session_id explicitly from the client; default covers edge cases.
