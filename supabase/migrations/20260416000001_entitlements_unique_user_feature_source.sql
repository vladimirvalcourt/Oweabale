-- Adds a unique constraint on (user_id, feature_key, source) so that the
-- stripeBilling helpers can use an atomic upsert instead of a non-atomic
-- DELETE + INSERT.  Previously the two-step approach created a window where
-- a concurrent webhook delivery could observe zero entitlements for a user
-- (after the DELETE but before the INSERT), or could produce duplicate rows.
--
-- Before adding the constraint we collapse any existing duplicate rows to the
-- most recently updated one, so the migration is safe to apply on a live DB.

-- 1. Remove duplicates, keeping only the row with the latest updated_at.
DELETE FROM public.entitlements
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, feature_key, source) id
  FROM public.entitlements
  ORDER BY user_id, feature_key, source, updated_at DESC NULLS LAST
);

-- 2. Add the unique constraint.
ALTER TABLE public.entitlements
  ADD CONSTRAINT entitlements_user_feature_source_unique
  UNIQUE (user_id, feature_key, source);
