-- Add visualization authorization and result columns to bookings
-- Client authorizes (visualization_authorized = true), artisan generates the 3D render

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS visualization_authorized boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS visualization_image_url text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS visualization_original_url text;
