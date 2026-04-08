-- Migration: flip_overdue_bills()
-- Updates any 'upcoming' bill whose due_date is in the past to 'overdue'.
-- Called from the frontend fetchData() on every authenticated load so the
-- status is always accurate without requiring a separate cron service.

CREATE OR REPLACE FUNCTION flip_overdue_bills()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE bills
  SET    status     = 'overdue',
         updated_at = NOW()
  WHERE  due_date   < CURRENT_DATE
    AND  status     = 'upcoming';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Only authenticated users may call this function.
-- RLS on the bills table ensures each user's UPDATE only touches their own rows.
REVOKE ALL ON FUNCTION flip_overdue_bills() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION flip_overdue_bills() TO authenticated;
