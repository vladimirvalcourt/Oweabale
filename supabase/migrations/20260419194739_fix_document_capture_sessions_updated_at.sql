-- Ensure document_capture_sessions has a stable updated_at column + trigger.
-- Some environments were missing this column, causing admin query/update mismatches.

ALTER TABLE public.document_capture_sessions
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.document_capture_sessions
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_document_capture_sessions_updated_at ON public.document_capture_sessions;
CREATE TRIGGER update_document_capture_sessions_updated_at
  BEFORE UPDATE ON public.document_capture_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
