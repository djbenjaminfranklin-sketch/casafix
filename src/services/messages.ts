import { supabase } from "../lib/supabase";
import { Message } from "../lib/database.types";

export async function sendMessage(bookingId: string, content: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: "Not authenticated" } };

    const { data, error } = await supabase
      .from("messages")
      .insert({
        booking_id: bookingId,
        sender_id: user.id,
        content,
      })
      .select()
      .single();

    return { data, error };
  } catch (e) {

    return { data: null, error: e };
  }
}

export async function getMessages(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    return { data: data || [], error };
  } catch (e) {

    return { data: [], error: e };
  }
}

export function subscribeToMessages(
  bookingId: string,
  callback: (message: Message) => void
) {
  const channel = supabase
    .channel(`messages-${bookingId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `booking_id=eq.${bookingId}`,
      },
      (payload) => {
        callback(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function markMessagesAsRead(bookingId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("messages")
      .update({ read: true })
      .eq("booking_id", bookingId)
      .neq("sender_id", user.id);
  } catch (e) {

  }
}
