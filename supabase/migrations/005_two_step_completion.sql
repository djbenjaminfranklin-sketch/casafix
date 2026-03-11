-- =============================================
-- CasaFix - Two-Step Work Completion (48h)
-- Artisan marks done → Client confirms → Payment released
-- =============================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS artisan_marked_done_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_confirmed BOOLEAN DEFAULT FALSE;

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_client_confirmation';

-- =============================================
-- Step 1: Artisan marks work as finished
-- =============================================
CREATE OR REPLACE FUNCTION public.artisan_mark_done(
  p_booking_id UUID,
  p_artisan_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM public.bookings
  WHERE id = p_booking_id AND artisan_id = p_artisan_id
  AND status IN ('price_accepted', 'work_in_progress');

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found or not in correct state');
  END IF;

  UPDATE public.bookings SET
    artisan_marked_done_at = NOW(),
    status = 'pending_client_confirmation'
  WHERE id = p_booking_id;

  -- The app should send a push notification to the client
  RETURN json_build_object(
    'success', true,
    'client_id', v_booking.client_id,
    'deadline', NOW() + INTERVAL '48 hours'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Step 2: Client confirms (existing function updated)
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
  AND status = 'pending_client_confirmation';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found or artisan has not marked work as done');
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
-- Auto-confirm after 48h if client didn't respond
-- Run via Supabase cron (pg_cron) every hour
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_confirm_expired_bookings()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.bookings SET
    work_completed_at = NOW(),
    auto_confirmed = TRUE,
    status = 'work_completed'
  WHERE status = 'pending_client_confirmation'
  AND artisan_marked_done_at < NOW() - INTERVAL '48 hours';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule auto-confirm every hour
SELECT cron.schedule(
  'auto-confirm-bookings',
  '0 * * * *',
  $$SELECT public.auto_confirm_expired_bookings()$$
);
