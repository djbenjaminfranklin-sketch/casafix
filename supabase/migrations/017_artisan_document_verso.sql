-- Add verso document URL and avatar storage URL fields for artisans
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS id_document_verso_url TEXT;
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS avatar_storage_url TEXT;
