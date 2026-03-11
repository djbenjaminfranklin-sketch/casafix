-- =============================================
-- CasaFix - Punctuality & Penalty System
-- =============================================

-- Add punctuality tracking to artisans
ALTER TABLE public.artisans
  ADD COLUMN punctuality_score NUMERIC(3,1) DEFAULT 5.0,
  ADD COLUMN late_count INTEGER DEFAULT 0,
  ADD COLUMN late_count_30d INTEGER DEFAULT 0,
  ADD COLUMN suspended_until TIMESTAMPTZ;

-- Add arrival tracking to bookings
ALTER TABLE public.bookings
  ADD COLUMN estimated_arrival TIMESTAMPTZ,
  ADD COLUMN actual_arrival TIMESTAMPTZ,
  ADD COLUMN deadline TIMESTAMPTZ,
  ADD COLUMN is_late BOOLEAN DEFAULT false,
  ADD COLUMN late_minutes INTEGER DEFAULT 0,
  ADD COLUMN penalty_applied BOOLEAN DEFAULT false,
  ADD COLUMN auto_cancelled BOOLEAN DEFAULT false;

-- Index for finding late bookings
CREATE INDEX idx_bookings_deadline ON public.bookings (deadline) WHERE status IN ('matched', 'in_progress');

-- =============================================
-- Function: Set deadline when artisan is matched (2h from match time)
-- =============================================
CREATE OR REPLACE FUNCTION public.set_booking_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'matched' AND OLD.status = 'searching' AND NEW.type = 'emergency' THEN
    NEW.deadline = NOW() + INTERVAL '2 hours';
    NEW.estimated_arrival = NOW() + INTERVAL '30 minutes'; -- default ETA
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_matched
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_deadline();

-- =============================================
-- Function: Record artisan arrival and check lateness
-- =============================================
CREATE OR REPLACE FUNCTION public.record_arrival(
  p_booking_id UUID,
  p_artisan_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_late_minutes INTEGER;
  v_is_late BOOLEAN;
  v_penalty_rate NUMERIC;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id AND artisan_id = p_artisan_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Booking not found');
  END IF;

  -- Calculate lateness
  v_late_minutes = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - v_booking.deadline)) / 60)::INTEGER;
  v_is_late = v_late_minutes > 0;

  -- Update booking
  UPDATE public.bookings SET
    actual_arrival = NOW(),
    is_late = v_is_late,
    late_minutes = v_late_minutes,
    status = 'in_progress'
  WHERE id = p_booking_id;

  -- If late, apply penalties
  IF v_is_late THEN
    -- Increment late count
    UPDATE public.artisans SET
      late_count = late_count + 1,
      late_count_30d = late_count_30d + 1,
      punctuality_score = GREATEST(1.0, punctuality_score -
        CASE
          WHEN v_late_minutes <= 30 THEN 0.3
          WHEN v_late_minutes <= 60 THEN 0.5
          ELSE 1.0
        END
      )
    WHERE id = p_artisan_id;

    -- Check for suspension: 3 lates in 30 days
    IF (SELECT late_count_30d FROM public.artisans WHERE id = p_artisan_id) >= 3 THEN
      UPDATE public.artisans SET
        suspended_until = NOW() + INTERVAL '7 days',
        is_available = false
      WHERE id = p_artisan_id;
    END IF;

    -- Check for deactivation: 5 lates in 60 days
    IF (SELECT late_count FROM public.artisans WHERE id = p_artisan_id) >= 5 THEN
      UPDATE public.artisans SET
        suspended_until = NOW() + INTERVAL '365 days',
        is_available = false
      WHERE id = p_artisan_id;
    END IF;

    UPDATE public.bookings SET penalty_applied = true WHERE id = p_booking_id;
  END IF;

  RETURN json_build_object(
    'is_late', v_is_late,
    'late_minutes', v_late_minutes,
    'penalty_applied', v_is_late
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Auto-cancel overdue bookings (called by cron or edge function)
-- =============================================
CREATE OR REPLACE FUNCTION public.auto_cancel_overdue()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Cancel bookings that passed the 2h deadline with no arrival
  UPDATE public.bookings SET
    status = 'cancelled',
    auto_cancelled = true
  WHERE type = 'emergency'
    AND status IN ('matched')
    AND deadline < NOW()
    AND actual_arrival IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Penalize artisans who didn't show up
  UPDATE public.artisans a SET
    late_count = a.late_count + 1,
    late_count_30d = a.late_count_30d + 1,
    punctuality_score = GREATEST(1.0, a.punctuality_score - 1.5)
  FROM public.bookings b
  WHERE b.artisan_id = a.id
    AND b.auto_cancelled = true
    AND b.penalty_applied = false
    AND b.updated_at > NOW() - INTERVAL '1 minute';

  -- Mark penalties as applied
  UPDATE public.bookings SET penalty_applied = true
  WHERE auto_cancelled = true AND penalty_applied = false;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Function: Reset 30-day late counter (run monthly via cron)
-- =============================================
CREATE OR REPLACE FUNCTION public.reset_monthly_late_count()
RETURNS void AS $$
BEGIN
  UPDATE public.artisans SET late_count_30d = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Update find_nearby_artisans to exclude suspended and low-score artisans
-- =============================================
CREATE OR REPLACE FUNCTION public.find_nearby_artisans(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_category_id TEXT,
  p_radius_km INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  rating NUMERIC,
  review_count INTEGER,
  punctuality_score NUMERIC,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.full_name,
    a.phone,
    a.avatar_url,
    a.rating,
    a.review_count,
    a.punctuality_score,
    ROUND((ST_Distance(
      a.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) / 1000)::numeric, 1)::double precision AS distance_km
  FROM public.artisans a
  WHERE a.is_available = true
    AND (a.suspended_until IS NULL OR a.suspended_until < NOW())
    AND p_category_id = ANY(a.categories)
    AND ST_DWithin(
      a.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY a.rating DESC, distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
