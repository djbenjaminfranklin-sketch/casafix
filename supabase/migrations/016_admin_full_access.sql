-- Admin can read ALL bookings
CREATE POLICY "Admins can read all bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  client_id = auth.uid()
  OR artisan_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Admin can update ALL bookings (cancel, reassign, force status)
CREATE POLICY "Admins can update all bookings"
ON bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Admin can read ALL profiles
CREATE POLICY "Admins can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Admin can update ALL profiles (suspend, delete)
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Admin can read ALL artisans
CREATE POLICY "Admins can read all artisans"
ON artisans FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Admin can update ALL artisans (validate, suspend)
CREATE POLICY "Admins can update all artisans"
ON artisans FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Admin can delete artisans
CREATE POLICY "Admins can delete artisans"
ON artisans FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Admin can read ALL reports
CREATE POLICY "Admins can read all reports"
ON reports FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Admin can update ALL reports (resolve, dismiss)
CREATE POLICY "Admins can update all reports"
ON reports FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Admin can read ALL reviews
CREATE POLICY "Admins can read all reviews"
ON reviews FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  OR artisan_id = auth.uid()
  OR client_id = auth.uid()
);

-- Admin can read ALL invoices
CREATE POLICY "Admins can read all invoices"
ON invoices FOR SELECT
TO authenticated
USING (
  client_id = auth.uid()
  OR artisan_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Admin can read/write notification_queue
CREATE POLICY "Admins can manage notification queue"
ON notification_queue FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  OR user_id = auth.uid()
);

-- Admin can read ALL messages
CREATE POLICY "Admins can read all messages"
ON messages FOR ALL
TO authenticated
USING (
  sender_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  OR booking_id IN (SELECT id FROM bookings WHERE client_id = auth.uid() OR artisan_id = auth.uid())
)
WITH CHECK (
  sender_id = auth.uid()
);

-- Admin can read ALL booking_media
CREATE POLICY "Admins can read all booking media"
ON booking_media FOR SELECT
TO authenticated
USING (
  client_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
