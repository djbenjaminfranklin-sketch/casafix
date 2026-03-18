-- Add business address to artisans
ALTER TABLE artisans ADD COLUMN IF NOT EXISTS business_address TEXT;

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  booking_id UUID NOT NULL REFERENCES bookings(id),
  client_id UUID NOT NULL,
  artisan_id UUID NOT NULL,
  -- Client info snapshot
  client_name TEXT NOT NULL,
  client_address TEXT,
  -- Artisan info snapshot
  artisan_name TEXT NOT NULL,
  artisan_business_address TEXT,
  artisan_nie_nif TEXT,
  artisan_autonomo_number TEXT,
  -- Service info
  service_name TEXT NOT NULL,
  service_date TIMESTAMPTZ NOT NULL,
  -- Amounts
  subtotal NUMERIC NOT NULL,
  iva_rate NUMERIC DEFAULT 21,
  iva_amount NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  casafix_commission NUMERIC NOT NULL,
  artisan_net NUMERIC NOT NULL,
  -- PDF
  pdf_url TEXT,
  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Both client and artisan can read their invoices
CREATE POLICY "Users can read their own invoices"
ON invoices FOR SELECT
TO authenticated
USING (client_id = auth.uid() OR artisan_id = auth.uid());

-- Function to auto-generate invoice after payment release
CREATE OR REPLACE FUNCTION generate_invoice_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_client profiles%ROWTYPE;
  v_artisan artisans%ROWTYPE;
  v_booking bookings%ROWTYPE;
  v_invoice_number TEXT;
  v_subtotal NUMERIC;
  v_iva NUMERIC;
  v_total NUMERIC;
  v_commission NUMERIC;
  v_net NUMERIC;
BEGIN
  -- Only trigger when payment_released_at is set
  IF NEW.payment_released_at IS NOT NULL AND OLD.payment_released_at IS NULL THEN
    -- Get booking details
    SELECT * INTO v_booking FROM bookings WHERE id = NEW.id;
    SELECT * INTO v_client FROM profiles WHERE id = v_booking.client_id;
    SELECT * INTO v_artisan FROM artisans WHERE id = v_booking.artisan_id;
    
    -- Calculate amounts (IVA 21% in Spain)
    v_total := COALESCE(v_booking.final_price, v_booking.proposed_price, 0);
    v_subtotal := ROUND(v_total / 1.21, 2);
    v_iva := v_total - v_subtotal;
    v_commission := ROUND(v_total * 0.18, 2); -- 15% + 3%
    v_net := v_total - v_commission;
    
    -- Generate invoice number: CF-YYYYMMDD-XXXX
    v_invoice_number := 'CF-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Insert invoice
    INSERT INTO invoices (
      invoice_number, booking_id, client_id, artisan_id,
      client_name, client_address,
      artisan_name, artisan_business_address, artisan_nie_nif, artisan_autonomo_number,
      service_name, service_date,
      subtotal, iva_rate, iva_amount, total,
      casafix_commission, artisan_net
    ) VALUES (
      v_invoice_number, NEW.id, v_booking.client_id, v_booking.artisan_id,
      COALESCE(v_client.full_name, ''), v_client.address,
      COALESCE(v_artisan.full_name, ''), v_artisan.business_address, v_artisan.nie_nif, v_artisan.autonomo_number,
      v_booking.service_name, COALESCE(v_booking.updated_at, NOW()),
      v_subtotal, 21, v_iva, v_total,
      v_commission, v_net
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_payment_released_generate_invoice ON bookings;
CREATE TRIGGER on_payment_released_generate_invoice
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_on_payment();
