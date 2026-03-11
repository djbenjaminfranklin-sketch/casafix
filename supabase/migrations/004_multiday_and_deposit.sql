-- =============================================
-- CasaFix - Multi-Day Work + Deposit System
-- =============================================

-- Add multi-day fields + deposit fields to bookings
ALTER TABLE public.bookings
  ADD COLUMN estimated_days INTEGER DEFAULT 1,
  ADD COLUMN work_start_date DATE,
  ADD COLUMN work_end_date DATE,
  ADD COLUMN work_completed_at TIMESTAMPTZ,
  ADD COLUMN is_multiday BOOLEAN DEFAULT FALSE,
  ADD COLUMN artisan_paid_at TIMESTAMPTZ,
  ADD COLUMN deposit_amount NUMERIC(10,2),
  ADD COLUMN stripe_remaining_payment_id TEXT;

-- Add new statuses
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'work_in_progress';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'work_completed';

-- =============================================
-- Update propose_price: artisan can propose ANY price
-- No more max_price limit — the deposit is just a guarantee
-- =============================================
CREATE OR REPLACE FUNCTION public.propose_price(
  p_booking_id UUID,
  p_artisan_id UUID,
  p_proposed_price NUMERIC,
  p_estimated_days INTEGER DEFAULT 1
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

  UPDATE public.bookings SET
    proposed_price = p_proposed_price,
    price_proposed_at = NOW(),
    estimated_days = p_estimated_days,
    is_multiday = (p_estimated_days > 1),
    status = 'price_proposed'
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'proposed_price', p_proposed_price,
    'estimated_days', p_estimated_days,
    'is_multiday', (p_estimated_days > 1),
    'deposit_amount', v_booking.deposit_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Update confirm_price: handles deposit + remaining charge
-- =============================================
CREATE OR REPLACE FUNCTION public.confirm_price(
  p_booking_id UUID,
  p_client_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_remaining NUMERIC;
BEGIN
  SELECT * INTO v_booking FROM public.bookings
  WHERE id = p_booking_id AND client_id = p_client_id AND status = 'price_proposed';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found or price not yet proposed');
  END IF;

  -- Calculate remaining amount (price - deposit)
  v_remaining = GREATEST(v_booking.proposed_price - COALESCE(v_booking.deposit_amount, v_booking.max_price), 0);

  UPDATE public.bookings SET
    final_price = v_booking.proposed_price,
    price_confirmed_at = NOW(),
    status = 'price_accepted'
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'final_price', v_booking.proposed_price,
    'deposit_amount', COALESCE(v_booking.deposit_amount, v_booking.max_price),
    'remaining_amount', v_remaining,
    'needs_additional_charge', (v_remaining > 0),
    'payment_intent_id', v_booking.stripe_payment_intent_id,
    'artisan_id', v_booking.artisan_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Start multi-day work
-- =============================================
CREATE OR REPLACE FUNCTION public.start_multiday_work(
  p_booking_id UUID,
  p_artisan_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM public.bookings
  WHERE id = p_booking_id AND artisan_id = p_artisan_id AND status = 'price_accepted';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found or price not accepted');
  END IF;

  IF NOT v_booking.is_multiday THEN
    RETURN json_build_object('error', 'This booking is not multi-day');
  END IF;

  UPDATE public.bookings SET
    work_start_date = CURRENT_DATE,
    work_end_date = CURRENT_DATE + (v_booking.estimated_days - 1),
    status = 'work_in_progress'
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'work_start_date', CURRENT_DATE,
    'work_end_date', CURRENT_DATE + (v_booking.estimated_days - 1),
    'estimated_days', v_booking.estimated_days
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Client confirms work is completed
-- =============================================
CREATE OR REPLACE FUNCTION public.complete_work(
  p_booking_id UUID,
  p_client_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM public.bookings
  WHERE id = p_booking_id AND client_id = p_client_id
  AND status IN ('price_accepted', 'work_in_progress');

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found or not in correct state');
  END IF;

  UPDATE public.bookings SET
    work_completed_at = NOW(),
    status = 'work_completed'
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'final_price', v_booking.proposed_price,
    'payment_intent_id', v_booking.stripe_payment_intent_id,
    'artisan_id', v_booking.artisan_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Mark artisan as paid
-- =============================================
CREATE OR REPLACE FUNCTION public.mark_artisan_paid(
  p_booking_id UUID
)
RETURNS JSON AS $$
BEGIN
  UPDATE public.bookings SET
    artisan_paid_at = NOW(),
    status = 'completed'
  WHERE id = p_booking_id AND status = 'work_completed';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found or work not completed');
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Update client_cancel_booking: use deposit for penalty
-- =============================================
CREATE OR REPLACE FUNCTION public.client_cancel_booking(
  p_booking_id UUID,
  p_client_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_fee NUMERIC;
  v_deposit NUMERIC;
BEGIN
  SELECT * INTO v_booking FROM public.bookings
  WHERE id = p_booking_id AND client_id = p_client_id
  AND status NOT IN ('completed', 'cancelled', 'price_accepted', 'work_in_progress', 'work_completed');

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found or already completed');
  END IF;

  v_deposit = COALESCE(v_booking.deposit_amount, v_booking.max_price);

  -- Calculate cancellation fee
  IF v_booking.status = 'price_proposed' THEN
    -- Artisan gave a price, client refuses → 75€ displacement fee
    v_fee = 75.00;
  ELSIF v_booking.actual_arrival IS NOT NULL THEN
    -- Artisan already on site → full deposit lost
    v_fee = v_deposit;
  ELSIF v_booking.status = 'matched' OR v_booking.status = 'in_progress' THEN
    -- Artisan matched/en route but not arrived → 30% of deposit
    v_fee = ROUND(v_deposit * 0.30, 2);
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
