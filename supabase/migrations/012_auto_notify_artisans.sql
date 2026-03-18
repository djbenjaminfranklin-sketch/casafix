-- Function to notify available artisans when a new booking is created
CREATE OR REPLACE FUNCTION notify_artisans_on_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  artisan_record RECORD;
BEGIN
  -- Only trigger on new bookings with status 'searching'
  IF NEW.status = 'searching' THEN
    -- Find available artisans that match the category
    FOR artisan_record IN
      SELECT a.id, ud.fcm_token
      FROM artisans a
      JOIN user_devices ud ON ud.user_id = a.id
      WHERE a.is_available = true
        AND NEW.category_id = ANY(a.categories)
        AND a.verified = true
        AND (a.suspended_until IS NULL OR a.suspended_until < NOW())
    LOOP
      -- Call the send-notification edge function via pg_net or just log
      -- For now, insert into a notifications queue table
      INSERT INTO notification_queue (user_id, title, body, data, created_at)
      VALUES (
        artisan_record.id,
        'Nouvelle demande',
        NEW.service_name,
        json_build_object('type', 'new_booking', 'booking_id', NEW.id)::text,
        NOW()
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data TEXT,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
ON notification_queue FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create trigger
DROP TRIGGER IF EXISTS on_new_booking_notify ON bookings;
CREATE TRIGGER on_new_booking_notify
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_artisans_on_new_booking();
