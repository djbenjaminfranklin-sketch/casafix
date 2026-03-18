// Supabase Edge Function: Process notification queue
// Reads unsent notifications from notification_queue, sends via send-notification, marks as sent
// Deploy with: supabase functions deploy process-notifications

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get unsent notifications
    const { data: notifications, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("sent", false)
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending notifications" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const notif of notifications) {
      try {
        // Get user's FCM tokens
        const { data: devices } = await supabase
          .from("user_devices")
          .select("fcm_token")
          .eq("user_id", notif.user_id);

        if (devices && devices.length > 0) {
          // Parse data if it's a string
          let notifData = notif.data || {};
          if (typeof notifData === "string") {
            try {
              notifData = JSON.parse(notifData);
            } catch {
              notifData = {};
            }
          }

          // Call send-notification for this user
          const { error: invokeError } = await supabase.functions.invoke(
            "send-notification",
            {
              body: {
                user_id: notif.user_id,
                title: notif.title,
                body: notif.body,
                data: notifData,
              },
            }
          );

          if (invokeError) {
            console.error(
              `Failed to send notification ${notif.id}:`,
              invokeError
            );
            failedCount++;
          } else {
            sentCount++;
          }
        }

        // Mark as sent regardless (to avoid infinite retries for users without devices)
        await supabase
          .from("notification_queue")
          .update({ sent: true })
          .eq("id", notif.id);
      } catch (err) {
        console.error(`Error processing notification ${notif.id}:`, err);
        failedCount++;

        // Still mark as sent to avoid infinite retries
        await supabase
          .from("notification_queue")
          .update({ sent: true })
          .eq("id", notif.id);
      }
    }

    return new Response(
      JSON.stringify({
        processed: notifications.length,
        sent: sentCount,
        failed: failedCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
