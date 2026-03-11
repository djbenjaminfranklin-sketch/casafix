-- =============================================
-- CasaFix - Booking Media (Photos & Videos)
-- =============================================

CREATE TABLE IF NOT EXISTS public.booking_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video')),
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_booking_media_booking ON public.booking_media(booking_id);

-- RLS
ALTER TABLE public.booking_media ENABLE ROW LEVEL SECURITY;

-- Client can insert media for their own bookings
CREATE POLICY "Clients can insert own booking media"
  ON public.booking_media FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Client can view their own media
CREATE POLICY "Clients can view own booking media"
  ON public.booking_media FOR SELECT
  USING (auth.uid() = client_id);

-- Artisan can view media for bookings assigned to them
CREATE POLICY "Artisans can view assigned booking media"
  ON public.booking_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_media.booking_id
      AND bookings.artisan_id = auth.uid()
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_media;

-- Storage bucket (run this in Supabase dashboard > Storage if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('booking-media', 'booking-media', true);
