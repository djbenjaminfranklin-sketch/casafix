-- =============================================
-- CasaFix Database Schema
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =============================================
-- 1. PROFILES (clients)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  address TEXT,
  city TEXT,
  preferred_language TEXT DEFAULT 'es',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 2. ARTISANS (professionals)
-- =============================================
CREATE TABLE public.artisans (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  categories TEXT[] NOT NULL DEFAULT '{}',
  is_available BOOLEAN DEFAULT false,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location GEOGRAPHY(Point, 4326),
  radius_km INTEGER DEFAULT 20,
  stripe_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for geolocation queries
CREATE INDEX idx_artisans_location ON public.artisans USING GIST(location);
CREATE INDEX idx_artisans_categories ON public.artisans USING GIN(categories);
CREATE INDEX idx_artisans_available ON public.artisans (is_available) WHERE is_available = true;

-- Auto-update location point when lat/lng change
CREATE OR REPLACE FUNCTION public.update_artisan_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_artisan_location_update
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.artisans
  FOR EACH ROW EXECUTE FUNCTION public.update_artisan_location();

-- =============================================
-- 3. BOOKINGS
-- =============================================
CREATE TYPE booking_type AS ENUM ('emergency', 'appointment');
CREATE TYPE booking_status AS ENUM ('pending', 'searching', 'matched', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artisan_id UUID REFERENCES public.artisans(id),
  category_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  price_range TEXT NOT NULL,
  type booking_type NOT NULL,
  status booking_status DEFAULT 'pending',
  scheduled_date DATE,
  scheduled_slot TEXT,
  max_price NUMERIC(10,2) NOT NULL,
  final_price NUMERIC(10,2),
  client_latitude DOUBLE PRECISION,
  client_longitude DOUBLE PRECISION,
  client_location GEOGRAPHY(Point, 4326),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_client ON public.bookings (client_id);
CREATE INDEX idx_bookings_artisan ON public.bookings (artisan_id);
CREATE INDEX idx_bookings_status ON public.bookings (status);
CREATE INDEX idx_bookings_location ON public.bookings USING GIST(client_location);

-- Auto-update location + updated_at
CREATE OR REPLACE FUNCTION public.update_booking_meta()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_latitude IS NOT NULL AND NEW.client_longitude IS NOT NULL THEN
    NEW.client_location = ST_SetSRID(ST_MakePoint(NEW.client_longitude, NEW.client_latitude), 4326)::geography;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_update
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_booking_meta();

-- =============================================
-- 4. REVIEWS
-- =============================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  artisan_id UUID NOT NULL REFERENCES public.artisans(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_artisan ON public.reviews (artisan_id);

-- Auto-update artisan rating when a review is added
CREATE OR REPLACE FUNCTION public.update_artisan_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.artisans SET
    rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE artisan_id = NEW.artisan_id),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE artisan_id = NEW.artisan_id)
  WHERE id = NEW.artisan_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_artisan_rating();

-- =============================================
-- 5. MESSAGES (chat)
-- =============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_booking ON public.messages (booking_id, created_at);

-- =============================================
-- 6. ROW LEVEL SECURITY
-- =============================================

-- Profiles: users can read/update their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Artisans: public read, own update
ALTER TABLE public.artisans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view artisans"
  ON public.artisans FOR SELECT
  USING (true);

CREATE POLICY "Artisans can update own profile"
  ON public.artisans FOR UPDATE
  USING (auth.uid() = id);

-- Bookings: client and assigned artisan can view
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Artisans can view assigned bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = artisan_id);

CREATE POLICY "Clients can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Artisans can update assigned bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = artisan_id);

-- Reviews: public read, client can create for their own bookings
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Clients can create reviews for their bookings"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Messages: participants can read/write
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id
      AND (client_id = auth.uid() OR artisan_id = auth.uid())
    )
  );

CREATE POLICY "Booking participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id
      AND (client_id = auth.uid() OR artisan_id = auth.uid())
    )
  );

-- =============================================
-- 7. REALTIME - Enable for live features
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- =============================================
-- 8. FUNCTION: Find nearest available artisans
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
    ROUND((ST_Distance(
      a.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) / 1000)::numeric, 1)::double precision AS distance_km
  FROM public.artisans a
  WHERE a.is_available = true
    AND p_category_id = ANY(a.categories)
    AND ST_DWithin(
      a.location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
