-- Add identity verification fields to artisans table
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS nie_nif TEXT;
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS autonomo_number TEXT;
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS id_document_url TEXT;
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS id_document_type TEXT CHECK (id_document_type IN ('nie', 'passport', 'id_card'));
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"newRequests": true, "bookingUpdates": true, "messages": true, "payments": true}'::jsonb;
