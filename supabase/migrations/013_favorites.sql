CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id),
  artisan_id UUID NOT NULL REFERENCES artisans(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, artisan_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites"
ON favorites FOR ALL
TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());
