import { supabase } from "../lib/supabase";
import { Booking, BookingType } from "../lib/database.types";

// Parse price range string "80€ - 150€" → extract max price as number
function extractMaxPrice(priceRange: string): number {
  const numbers = priceRange.match(/\d+/g);
  if (!numbers || numbers.length === 0) return 0;
  return Math.max(...numbers.map(Number));
}

// Create a new booking
export async function createBooking(params: {
  categoryId: string;
  serviceId: string;
  serviceName: string;
  priceRange: string;
  type: BookingType;
  scheduledDate?: string;
  scheduledSlot?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
}): Promise<{ data: Booking | null; error: any }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: { message: "Not authenticated" } };

  const maxPrice = extractMaxPrice(params.priceRange);

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      client_id: user.id,
      category_id: params.categoryId,
      service_id: params.serviceId,
      service_name: params.serviceName,
      price_range: params.priceRange,
      type: params.type,
      max_price: maxPrice,
      scheduled_date: params.scheduledDate || null,
      scheduled_slot: params.scheduledSlot || null,
      status: "searching",
      client_latitude: params.latitude || null,
      client_longitude: params.longitude || null,
      description: params.description || null,
    })
    .select()
    .single();

  return { data, error };
}

// Get bookings for current user
export async function getMyBookings(): Promise<{ data: Booking[]; error: any }> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

// Get a single booking with artisan info
export async function getBookingWithArtisan(bookingId: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      artisan:artisans(id, full_name, phone, avatar_url, rating, review_count)
    `)
    .eq("id", bookingId)
    .single();

  return { data, error };
}

// Subscribe to booking status changes (realtime)
export function subscribeToBooking(
  bookingId: string,
  callback: (booking: Booking) => void
) {
  const channel = supabase
    .channel(`booking-${bookingId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "bookings",
        filter: `id=eq.${bookingId}`,
      },
      (payload) => {
        callback(payload.new as Booking);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Cancel a booking
export async function cancelBooking(bookingId: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  return { error };
}
