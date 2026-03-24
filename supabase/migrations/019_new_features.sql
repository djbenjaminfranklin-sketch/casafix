-- =============================================
-- 019: Promo codes, Referrals, Address book, Artisan portfolio
-- =============================================

-- =============================================
-- 1. PROMO CODES
-- =============================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2),       -- e.g. 10.00 for 10%
  discount_amount NUMERIC(10,2),       -- e.g. 15.00 for 15€ flat
  valid_until TIMESTAMPTZ,
  max_uses INTEGER DEFAULT 100,
  current_uses INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active promo codes (to validate)
CREATE POLICY "promo_codes_select" ON public.promo_codes
  FOR SELECT TO authenticated
  USING (active = true);

-- Only service_role can insert/update/delete
CREATE POLICY "promo_codes_admin" ON public.promo_codes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =============================================
-- 2. USER PROMO CODES (applied by users)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_promo_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_percent NUMERIC(5,2),
  discount_amount NUMERIC(10,2),
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, promo_code_id)
);

ALTER TABLE public.user_promo_codes ENABLE ROW LEVEL SECURITY;

-- Users can only see and insert their own
CREATE POLICY "user_promo_codes_select" ON public.user_promo_codes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_promo_codes_insert" ON public.user_promo_codes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 3. REFERRALS
-- =============================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_amount NUMERIC(10,2) DEFAULT 10.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can see their own referrals (as referrer)
CREATE POLICY "referrals_select" ON public.referrals
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

-- Anyone authenticated can insert (when applying a referral code)
CREATE POLICY "referrals_insert" ON public.referrals
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================
-- 4. SAVED ADDRESSES (client address book)
-- =============================================
CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Maison',
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own addresses
CREATE POLICY "saved_addresses_select" ON public.saved_addresses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "saved_addresses_insert" ON public.saved_addresses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_addresses_update" ON public.saved_addresses
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_addresses_delete" ON public.saved_addresses
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_saved_addresses_user ON public.saved_addresses(user_id);

-- =============================================
-- 5. ARTISAN PORTFOLIO
-- =============================================
CREATE TABLE IF NOT EXISTS public.artisan_portfolio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artisan_id UUID NOT NULL REFERENCES public.artisans(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.artisan_portfolio ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view portfolio (clients browse artisan work)
CREATE POLICY "artisan_portfolio_select" ON public.artisan_portfolio
  FOR SELECT TO authenticated
  USING (true);

-- Only the artisan or service_role can insert/update/delete
CREATE POLICY "artisan_portfolio_insert" ON public.artisan_portfolio
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = artisan_id);

CREATE POLICY "artisan_portfolio_update" ON public.artisan_portfolio
  FOR UPDATE TO authenticated
  USING (auth.uid() = artisan_id)
  WITH CHECK (auth.uid() = artisan_id);

CREATE POLICY "artisan_portfolio_delete" ON public.artisan_portfolio
  FOR DELETE TO authenticated
  USING (auth.uid() = artisan_id);

-- Index for fast lookup by artisan
CREATE INDEX IF NOT EXISTS idx_artisan_portfolio_artisan ON public.artisan_portfolio(artisan_id);

-- =============================================
-- 6. Add cancel_reason to bookings (for no-show tracking)
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'cancel_reason'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN cancel_reason TEXT;
  END IF;
END $$;
