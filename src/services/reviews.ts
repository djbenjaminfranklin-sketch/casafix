import { supabase } from "../lib/supabase";

// Create a review for a completed booking
export async function createReview(params: {
  bookingId: string;
  artisanId: string;
  rating: number;
  comment?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Not authenticated" } };

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      booking_id: params.bookingId,
      client_id: user.id,
      artisan_id: params.artisanId,
      rating: params.rating,
      comment: params.comment || null,
    })
    .select()
    .single();

  return { data, error };
}

// Create a review for a client (artisan → client)
export async function createClientReview(params: {
  bookingId: string;
  clientId: string;
  rating: number;
  comment?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Not authenticated" } };

  const { data, error } = await supabase
    .from("client_reviews")
    .insert({
      booking_id: params.bookingId,
      artisan_id: user.id,
      client_id: params.clientId,
      rating: params.rating,
      comment: params.comment || null,
    })
    .select()
    .single();

  return { data, error };
}

// Get reviews for a client
export async function getClientReviews(clientId: string) {
  const { data, error } = await supabase
    .from("client_reviews")
    .select(`
      *,
      artisan:artisans(full_name, avatar_url)
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}

// Get reviews for an artisan
export async function getArtisanReviews(artisanId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      *,
      client:profiles(full_name, avatar_url)
    `)
    .eq("artisan_id", artisanId)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}
