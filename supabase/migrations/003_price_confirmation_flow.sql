-- =============================================
-- CasaFix - Price Confirmation Flow
-- =============================================

-- Add price proposal and cancellation fields to bookings
ALTER TABLE public.bookings
  ADD COLUMN proposed_price NUMERIC(10,2),
  ADD COLUMN price_proposed_at TIMESTAMPTZ,
  ADD COLUMN price_confirmed_at TIMESTAMPTZ,
  ADD COLUMN cancellation_fee NUMERIC(10,2),
  ADD COLUMN cancelled_by TEXT CHECK (cancelled_by IN ('client', 'system')),
  ADD COLUMN cancelled_at TIMESTAMPTZ;

-- Update booking status enum to include new states
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'price_proposed';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'price_accepted';

-- Policy: clients can also update their own bookings (to confirm price / cancel)
CREATE POLICY "Clients can update own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = client_id);

-- =============================================
-- Function: Artisan proposes final price
-- Called from CasaFix Pro app
-- =============================================
CREATE OR REPLACE FUNCTION public.propose_price(
  p_booking_id UUID,
  p_artisan_id UUID,
  p_proposed_price NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM public.bookings
  WHERE id = p_booking_id AND artisan_id = p_artisan_id AND status = 'in_progress';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found or not in progress');
  END IF;

  -- Proposed price cannot exceed max price
  IF p_proposed_price > v_booking.max_price THEN
    RETURN json_build_object('error', 'Price exceeds maximum authorized amount');
  END IF;

  UPDATE public.bookings SET
    proposed_price = p_proposed_price,
    price_proposed_at = NOW(),
    status = 'price_proposed'
  WHERE id = p_booking_id;

  RETURN json_build_object('success', true, 'proposed_price', p_proposed_price);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Client confirms the price → payment captured
-- Called from CasaFix client app
-- =============================================
CREATE OR REPLACE FUNCTION public.confirm_price(
  p_booking_id UUID,
  p_client_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM public.bookings
  WHERE id = p_booking_id AND client_id = p_client_id AND status = 'price_proposed';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found or price not yet proposed');
  END IF;

  UPDATE public.bookings SET
    final_price = proposed_price,
    price_confirmed_at = NOW(),
    status = 'price_accepted'
  WHERE id = p_booking_id;

  -- The actual Stripe capture will be triggered by the app via Edge Function
  RETURN json_build_object(
    'success', true,
    'final_price', v_booking.proposed_price,
    'payment_intent_id', v_booking.stripe_payment_intent_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Client cancels booking
-- Cancellation fee applies if artisan already arrived
-- =============================================
CREATE OR REPLACE FUNCTION public.client_cancel_booking(
  p_booking_id UUID,
  p_client_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_fee NUMERIC;
BEGIN
  SELECT * INTO v_booking FROM public.bookings
  WHERE id = p_booking_id AND client_id = p_client_id
  AND status NOT IN ('completed', 'cancelled', 'price_accepted');

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found or already completed');
  END IF;

  -- Calculate cancellation fee
  IF v_booking.actual_arrival IS NOT NULL THEN
    -- Artisan already arrived → client loses full pre-auth amount
    v_fee = v_booking.max_price;
  ELSIF v_booking.status = 'matched' OR v_booking.status = 'in_progress' THEN
    -- Artisan matched but not arrived → 30% fee
    v_fee = ROUND(v_booking.max_price * 0.30, 2);
  ELSE
    -- Still searching or pending → free cancellation
    v_fee = 0;
  END IF;

  UPDATE public.bookings SET
    status = 'cancelled',
    cancelled_by = 'client',
    cancelled_at = NOW(),
    cancellation_fee = v_fee,
    final_price = v_fee
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'cancellation_fee', v_fee,
    'payment_intent_id', v_booking.stripe_payment_intent_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
