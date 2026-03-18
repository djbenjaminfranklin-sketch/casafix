-- Allow admins to read all messages
CREATE POLICY "Admins can read all messages"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  OR sender_id = auth.uid()
  OR booking_id IN (SELECT id FROM bookings WHERE client_id = auth.uid() OR artisan_id = auth.uid())
);

-- Allow admins to send messages on any booking
CREATE POLICY "Admins can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
);
