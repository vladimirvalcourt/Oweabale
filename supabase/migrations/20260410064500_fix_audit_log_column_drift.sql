-- Reconcile audit_log schema drift between environments.
-- Some environments use operation/row_id while others use action/record_id.
-- This migration keeps both pairs in sync and removes duplicate audit triggers.

BEGIN;

ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS action TEXT,
  ADD COLUMN IF NOT EXISTS operation TEXT,
  ADD COLUMN IF NOT EXISTS row_id TEXT,
  ADD COLUMN IF NOT EXISTS record_id TEXT;

UPDATE public.audit_log
SET action = operation
WHERE action IS NULL AND operation IS NOT NULL;

UPDATE public.audit_log
SET operation = action
WHERE operation IS NULL AND action IS NOT NULL;

UPDATE public.audit_log
SET record_id = COALESCE(record_id, row_id),
    row_id = COALESCE(row_id, record_id)
WHERE record_id IS NULL OR row_id IS NULL;

DROP TRIGGER IF EXISTS trg_audit_bills ON public.bills;
DROP TRIGGER IF EXISTS trg_audit_debts ON public.debts;
DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
DROP TRIGGER IF EXISTS trg_audit_assets ON public.assets;

DROP TRIGGER IF EXISTS audit_bills ON public.bills;
CREATE TRIGGER audit_bills
AFTER INSERT OR UPDATE OR DELETE ON public.bills
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS audit_debts ON public.debts;
CREATE TRIGGER audit_debts
AFTER INSERT OR UPDATE OR DELETE ON public.debts
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS audit_transactions ON public.transactions;
CREATE TRIGGER audit_transactions
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

DROP TRIGGER IF EXISTS audit_assets ON public.assets;
CREATE TRIGGER audit_assets
AFTER INSERT OR UPDATE OR DELETE ON public.assets
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trigger();

COMMIT;
