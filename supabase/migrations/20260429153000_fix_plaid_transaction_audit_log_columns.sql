-- Plaid transaction sync was blocked in production because the transactions
-- audit trigger wrote only action/record_id while audit_log still requires
-- operation/row_id. Keep both schema variants populated.

BEGIN;

CREATE OR REPLACE FUNCTION public.log_transaction_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  audit_user_id uuid;
  audit_row_id text;
BEGIN
  audit_user_id := COALESCE(NEW.user_id, OLD.user_id);
  audit_row_id := COALESCE(NEW.id::text, OLD.id::text);

  INSERT INTO public.audit_log (
    user_id,
    table_name,
    operation,
    action,
    row_id,
    record_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    audit_user_id,
    'transactions',
    TG_OP,
    TG_OP,
    audit_row_id,
    audit_row_id,
    CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Audit logging must never block user-visible writes or Plaid sync.
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_transaction_changes ON public.transactions;
DROP TRIGGER IF EXISTS audit_transactions ON public.transactions;
DROP TRIGGER IF EXISTS transactions_audit ON public.transactions;
DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;

CREATE TRIGGER trg_log_transaction_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_changes();

COMMIT;
