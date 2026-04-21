-- FIX 3: Repair audit trigger on transactions table
-- The existing trigger is missing TG_OP capture into the action column

-- First drop and recreate the trigger function for transactions
-- (using the same pattern as bills/assets triggers)

CREATE OR REPLACE FUNCTION public.log_transaction_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    table_name,
    action,
    record_id,
    old_data,
    new_data,
    created_at
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    'transactions',
    TG_OP,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists (may be named differently)
DROP TRIGGER IF EXISTS trg_log_transaction_changes ON public.transactions;
DROP TRIGGER IF EXISTS audit_transactions ON public.transactions;
DROP TRIGGER IF EXISTS transactions_audit ON public.transactions;

-- Recreate with correct trigger capturing all ops
CREATE TRIGGER trg_log_transaction_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_transaction_changes();

-- Verify the fix by checking trigger exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trg_log_transaction_changes'
      AND event_object_table = 'transactions'
  ) THEN
    RAISE NOTICE '✓ FIX 3 complete: transactions audit trigger repaired';
  ELSE
    RAISE EXCEPTION 'FIX 3 FAILED: trigger not created';
  END IF;
END $$;
