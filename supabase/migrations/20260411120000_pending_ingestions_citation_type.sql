-- Allow Review Inbox rows for tickets / citations (tolls, fines, etc.)
ALTER TABLE public.pending_ingestions
  DROP CONSTRAINT IF EXISTS pending_ingestions_type_check;

ALTER TABLE public.pending_ingestions
  ADD CONSTRAINT pending_ingestions_type_check
  CHECK (type IN ('bill', 'debt', 'transaction', 'income', 'citation'));
