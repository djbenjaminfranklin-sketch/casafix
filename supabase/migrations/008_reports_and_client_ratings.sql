-- =============================================
-- 008: Reports System & Client Ratings
-- =============================================

-- =============================================
-- 1. CLIENT RATING (on profiles table)
-- =============================================
ALTER TABLE public.profiles
  ADD COLUMN rating NUMERIC(2,1) DEFAULT 5.0,
  ADD COLUMN rating_count INTEGER DEFAULT 0;

-- =============================================
-- 2. CLIENT REVIEWS (artisan → client)
-- =============================================
CREATE TABLE public.client_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  artisan_id UUID NOT NULL REFERENCES public.artisans(id),
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, artisan_id)
);

CREATE INDEX idx_client_reviews_client ON public.client_reviews (client_id);

-- Auto-update client rating when a review is added
CREATE OR REPLACE FUNCTION public.update_client_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET
    rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.client_reviews WHERE client_id = NEW.client_id),
    rating_count = (SELECT COUNT(*) FROM public.client_reviews WHERE client_id = NEW.client_id)
  WHERE id = NEW.client_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_client_review_created
  AFTER INSERT ON public.client_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_client_rating();

-- RLS for client_reviews
ALTER TABLE public.client_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view client reviews"
  ON public.client_reviews FOR SELECT
  USING (true);

CREATE POLICY "Artisans can create reviews for their bookings"
  ON public.client_reviews FOR INSERT
  WITH CHECK (
    auth.uid() = artisan_id
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND artisan_id = auth.uid()
    )
  );

-- =============================================
-- 3. REPORTS TABLE
-- =============================================
CREATE TYPE report_reason AS ENUM (
  'off_app_payment',
  'no_show',
  'inappropriate_behavior',
  'price_dispute',
  'poor_quality',
  'other'
);

CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  reported_user_id UUID NOT NULL REFERENCES auth.users(id),
  reason report_reason NOT NULL,
  description TEXT,
  status report_status DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(booking_id, reporter_id)
);

CREATE INDEX idx_reports_reported ON public.reports (reported_user_id);
CREATE INDEX idx_reports_status ON public.reports (status);

-- RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports for their bookings"
  ON public.reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id
      AND (client_id = auth.uid() OR artisan_id = auth.uid())
    )
  );

-- =============================================
-- 4. AUTO-FLAG: Suspend artisan after 3 off_app_payment reports
-- =============================================
CREATE OR REPLACE FUNCTION public.check_report_threshold()
RETURNS TRIGGER AS $$
DECLARE
  report_count INTEGER;
BEGIN
  IF NEW.reason = 'off_app_payment' THEN
    SELECT COUNT(*) INTO report_count
    FROM public.reports
    WHERE reported_user_id = NEW.reported_user_id
      AND reason = 'off_app_payment'
      AND status != 'dismissed';

    -- Auto-suspend artisan after 3 reports
    IF report_count >= 3 THEN
      UPDATE public.artisans SET
        is_available = false,
        suspended_until = NOW() + INTERVAL '30 days'
      WHERE id = NEW.reported_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_report_created
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.check_report_threshold();
