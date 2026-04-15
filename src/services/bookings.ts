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
  is_night_rate?: boolean;
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
      status: "pending",
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

// Report artisan no-show: cancel booking, flag artisan, file report
export async function reportNoShow(bookingId: string, relaunch: boolean = false) {
  // Get booking details
  const { data: booking } = await supabase
    .from("bookings")
    .select("*, artisan:artisans(id, full_name)")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: { message: "Booking not found" } };

  if (relaunch) {
    // Reset booking to searching — remove artisan, keep booking alive
    await supabase
      .from("bookings")
      .update({
        status: "searching",
        artisan_id: null,
        cancel_reason: null,
        estimated_arrival: null,
        artisan_arrived_at: null,
        proposed_price: null,
      })
      .eq("id", bookingId);
  } else {
    // Cancel the booking
    await supabase
      .from("bookings")
      .update({ status: "cancelled", cancel_reason: "artisan_no_show" })
      .eq("id", bookingId);
  }

  // File a report for the no-show
  if (booking.artisan_id) {
    await supabase.from("reports").insert({
      booking_id: bookingId,
      reporter_id: booking.client_id,
      reported_id: booking.artisan_id,
      reason: "no_show",
      description: `Artisan ${booking.artisan?.full_name || "unknown"} did not show up for booking ${bookingId}`,
    });

    // Notify admin about the no-show
    const { data: admins } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_admin", true);

    if (admins) {
      for (const admin of admins) {
        await supabase.from("notification_queue").insert({
          user_id: admin.id,
          title: "Signalement no-show",
          body: `L'artisan ${booking.artisan?.full_name || "inconnu"} ne s'est pas présenté pour la réservation ${bookingId.slice(0, 8)}...`,
          data: JSON.stringify({ type: "no_show_report", booking_id: bookingId }),
          sent: false,
        });
      }
      supabase.functions.invoke("process-notifications").catch(() => {});
    }
  }

  // Release payment hold if exists (only if cancelling, not relaunching)
  if (!relaunch && booking.stripe_payment_intent_id) {
    try {
      await supabase.functions.invoke("release-payment", {
        body: { bookingId },
      });
    } catch {}
  }

  return { error: null };
}
