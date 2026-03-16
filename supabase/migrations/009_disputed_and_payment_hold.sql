-- =============================================
-- 009: Disputed Status & 48h Payment Hold
-- Money held for 48h after artisan marks done.
-- Auto-released to artisan if no dispute.
-- Frozen if client files a report.
-- =============================================

-- 1. Add 'disputed' status and payment_released_at column
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'disputed';

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_released_at TIMESTAMPTZ;

-- =============================================
-- 2. Update auto-confirm to SKIP disputed bookings
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_confirm_expired_bookings()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_booking RECORD;
BEGIN
  -- Find all bookings past 48h that are NOT disputed and have no pending report
  FOR v_booking IN
    SELECT b.id, b.stripe_payment_intent_id, b.proposed_price, b.artisan_id
    FROM public.bookings b
    WHERE b.status = 'pending_client_confirmation'
      AND b.artisan_marked_done_at < NOW() - INTERVAL '48 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.reports r
        WHERE r.booking_id = b.id
          AND r.status IN ('pending', 'reviewed')
      )
  LOOP
    -- Mark as auto-confirmed
    UPDATE public.bookings SET
      work_completed_at = NOW(),
      auto_confirmed = TRUE,
      final_price = proposed_price,
      status = 'completed'
    WHERE id = v_booking.id;

    -- NOTE: The Edge Function 'release-payment' should be called
    -- via a postgres_changes listener or a separate cron to handle
    -- the actual Stripe transfer to the artisan's connected account.
  END LOOP;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. When a report is filed for a booking in pending_client_confirmation,
--    freeze the booking (set status to 'disputed')
-- =============================================
CREATE OR REPLACE FUNCTION public.freeze_booking_on_report()
RETURNS TRIGGER AS $$
BEGIN
  -- If the booking is currently in the 48h hold period, freeze it
  UPDATE public.bookings SET
    status = 'disputed'
  WHERE id = NEW.booking_id
    AND status = 'pending_client_confirmation';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_report_freeze_booking
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.freeze_booking_on_report();

-- =============================================
-- 4. Admin resolves dispute → release or refund
-- =============================================
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  p_booking_id UUID,
  p_resolution TEXT, -- 'release_to_artisan' or 'refund_client'
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
BEGIN
  SELECT * INTO v_booking FROM public.bookings
  WHERE id = p_booking_id AND status = 'disputed';

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found or not disputed');
  END IF;

  IF p_resolution = 'release_to_artisan' THEN
    UPDATE public.bookings SET
      status = 'completed',
      final_price = proposed_price,
      work_completed_at = NOW()
    WHERE id = p_booking_id;
  ELSIF p_resolution = 'refund_client' THEN
    UPDATE public.bookings SET
      status = 'cancelled'
    WHERE id = p_booking_id;
  ELSE
    RETURN json_build_object('error', 'Invalid resolution: use release_to_artisan or refund_client');
  END IF;

  -- Mark all related reports as resolved
  UPDATE public.reports SET
    status = 'resolved',
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    resolved_at = NOW()
  WHERE booking_id = p_booking_id
    AND status IN ('pending', 'reviewed');

  RETURN json_build_object(
    'success', true,
    'resolution', p_resolution,
    'payment_intent_id', v_booking.stripe_payment_intent_id,
    'artisan_id', v_booking.artisan_id,
    'amount', v_booking.proposed_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. Also update complete_work to set final_price
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
    final_price = proposed_price,
    status = 'completed'
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'final_price', v_booking.proposed_price,
    'payment_intent_id', v_booking.stripe_payment_intent_id,
    'artisan_id', v_booking.artisan_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
