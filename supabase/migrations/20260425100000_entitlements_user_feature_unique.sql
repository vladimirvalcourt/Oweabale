-- Admin grant_entitlement used PostgREST upsert onConflict (user_id, feature_key) but no unique
-- existed, causing non-2xx failures. Deduplicate then enforce one row per user per feature.

DELETE FROM public.entitlements e
WHERE e.id IN (
  SELECT id
  FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, feature_key
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id
      ) AS rn
    FROM public.entitlements
  ) ranked
  WHERE ranked.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS entitlements_user_id_feature_key_uidx
  ON public.entitlements (user_id, feature_key);
