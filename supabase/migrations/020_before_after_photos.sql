CREATE TABLE IF NOT EXISTS public.booking_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('before', 'after')),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.booking_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_photos_select" ON public.booking_photos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "booking_photos_insert" ON public.booking_photos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

CREATE INDEX IF NOT EXISTS idx_booking_photos_booking ON public.booking_photos(booking_id);
