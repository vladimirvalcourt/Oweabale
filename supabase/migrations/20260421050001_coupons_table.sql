-- ADD 6: Coupons table for promo code management
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL DEFAULT 0,
  max_uses int,
  uses_count int NOT NULL DEFAULT 0,
  valid_until timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only admins
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_full_access_coupons" ON public.coupons;
CREATE POLICY "admin_full_access_coupons"
  ON public.coupons
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Public read for code validation (anonymous lookup for checkout)
DROP POLICY IF EXISTS "public_read_active_coupons" ON public.coupons;
CREATE POLICY "public_read_active_coupons"
  ON public.coupons FOR SELECT
  USING (active = true AND (valid_until IS NULL OR valid_until > now()));

-- Auto-increment uses_count via RPC (called from checkout logic)
CREATE OR REPLACE FUNCTION public.use_coupon(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
BEGIN
  SELECT * INTO v_coupon FROM public.coupons WHERE code = p_code FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon not found');
  END IF;
  IF NOT v_coupon.active THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon is inactive');
  END IF;
  IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon has expired');
  END IF;
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.uses_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Coupon usage limit reached');
  END IF;
  UPDATE public.coupons SET uses_count = uses_count + 1 WHERE id = v_coupon.id;
  RETURN jsonb_build_object(
    'ok', true,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value
  );
END;
$$;

DO $$ BEGIN
  RAISE NOTICE '✓ Coupons table and use_coupon() function created';
END $$;
