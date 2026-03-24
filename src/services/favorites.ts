import { supabase } from "../lib/supabase";

export async function addFavorite(artisanId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("favorites")
      .insert({ client_id: user.id, artisan_id: artisanId })
      .select()
      .single();

    return { data, error };
  } catch (e) {

    return { data: null, error: e };
  }
}

export async function removeFavorite(artisanId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "Not authenticated" } };

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("client_id", user.id)
      .eq("artisan_id", artisanId);

    return { error };
  } catch (e) {

    return { error: e };
  }
}

export async function getMyFavorites() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: { message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("favorites")
      .select(`
        id,
        artisan_id,
        created_at,
        artisan:artisans(id, full_name, avatar_url, rating, review_count, categories, is_available)
      `)
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });

    return { data: data || [], error };
  } catch (e) {

    return { data: [], error: e };
  }
}

export async function isFavorite(artisanId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("client_id", user.id)
      .eq("artisan_id", artisanId)
      .maybeSingle();

    return !!data;
  } catch (e) {

    return false;
  }
}
