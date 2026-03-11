import { supabase } from "../lib/supabase";
import { Message } from "../lib/database.types";

// Send a message in a booking chat
export async function sendMessage(bookingId: string, content: string) {
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
}

// Get messages for a booking
export async function getMessages(bookingId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  return { data: data || [], error };
}

// Subscribe to new messages (realtime)
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

// Mark messages as read
export async function markMessagesAsRead(bookingId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("messages")
    .update({ read: true })
    .eq("booking_id", bookingId)
    .neq("sender_id", user.id);
}
