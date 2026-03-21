import { supabase } from "../lib/supabase";

export type Invoice = {
  id: string;
  invoice_number: string;
  booking_id: string;
  client_id: string;
  artisan_id: string;
  client_name: string;
  client_address: string | null;
  artisan_name: string;
  artisan_business_address: string | null;
  artisan_nie_nif: string | null;
  artisan_autonomo_number: string | null;
  service_name: string;
  service_date: string;
  subtotal: number;
  iva_rate: number;
  iva_amount: number;
  total: number;
  casafix_commission: number;
  artisan_net: number;
  pdf_url: string | null;
  created_at: string;
};

export async function getMyInvoices(): Promise<{ data: Invoice[]; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: { message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .or(`client_id.eq.${user.id},artisan_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    return { data: data || [], error };
  } catch (e) {
    console.warn("getMyInvoices error:", e);
    return { data: [], error: e };
  }
}

export async function getInvoiceByBooking(
  bookingId: string
): Promise<{ data: Invoice | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();

    return { data: data || null, error };
  } catch (e) {
    console.warn("getInvoiceByBooking error:", e);
    return { data: null, error: e };
  }
}
