import { supabase } from "../lib/supabase";

export type SavedAddress = {
  id: string;
  user_id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  is_default: boolean;
  created_at: string;
};

export async function getSavedAddresses(): Promise<{ data: SavedAddress[]; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: { message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("saved_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    return { data: data || [], error };
  } catch (e) {
    console.warn("getSavedAddresses error:", e);
    return { data: [], error: e };
  }
}

export async function saveAddress(
  label: string,
  address: string,
  latitude: number,
  longitude: number,
  isDefault: boolean = false
): Promise<{ data: SavedAddress | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    // If setting as default, unset previous default
    if (isDefault) {
      await supabase
        .from("saved_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("is_default", true);
    }

    const { data, error } = await supabase
      .from("saved_addresses")
      .insert({
        user_id: user.id,
        label,
        address,
        latitude,
        longitude,
        is_default: isDefault,
      })
      .select()
      .single();

    return { data, error };
  } catch (e) {
    console.warn("saveAddress error:", e);
    return { data: null, error: e };
  }
}

export async function deleteAddress(id: string): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "Not authenticated" } };

    const { error } = await supabase
      .from("saved_addresses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return { error };
  } catch (e) {
    console.warn("deleteAddress error:", e);
    return { error: e };
  }
}

export async function updateAddress(
  id: string,
  updates: Partial<Pick<SavedAddress, "label" | "address" | "latitude" | "longitude" | "is_default">>
): Promise<{ data: SavedAddress | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: "Not authenticated" } };

    // If setting as default, unset previous default
    if (updates.is_default) {
      await supabase
        .from("saved_addresses")
        .update({ is_default: false })
        .eq("user_id", user.id)
        .eq("is_default", true);
    }

    const { data, error } = await supabase
      .from("saved_addresses")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    return { data, error };
  } catch (e) {
    console.warn("updateAddress error:", e);
    return { data: null, error: e };
  }
}
