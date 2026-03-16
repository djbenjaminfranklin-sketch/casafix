import { supabase } from "../lib/supabase";

export type ReportReason =
  | "off_app_payment"
  | "no_show"
  | "inappropriate_behavior"
  | "price_dispute"
  | "poor_quality"
  | "other";

export async function createReport(params: {
  bookingId: string;
  reportedUserId: string;
  reason: ReportReason;
  description?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: { message: "Not authenticated" } };

  const { data, error } = await supabase
    .from("reports")
    .insert({
      booking_id: params.bookingId,
      reporter_id: user.id,
      reported_user_id: params.reportedUserId,
      reason: params.reason,
      description: params.description || null,
    })
    .select()
    .single();

  return { data, error };
}

export async function getMyReports() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: null };

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("reporter_id", user.id)
    .order("created_at", { ascending: false });

  return { data: data || [], error };
}
