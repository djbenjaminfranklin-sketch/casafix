// Supabase Edge Function: Process notification queue and send FCM push directly
// Deploy with: supabase functions deploy process-notifications --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toBase64Url(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Get OAuth 2.0 access token from Firebase service account
async function getFirebaseAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64Url(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  const pemKey = serviceAccount.private_key;
  const pemContents = pemKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureInput = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, signatureInput);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${header}.${payload}.${signatureBase64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Firebase auth failed: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const serviceAccountRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");

    if (!serviceAccountRaw || !projectId) {
      throw new Error("Firebase configuration missing. Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_KEY secrets.");
    }

    const serviceAccount = JSON.parse(serviceAccountRaw);

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

    if (fetchError) throw new Error(`Queue fetch error: ${fetchError.message}`);

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Firebase access token
    const accessToken = await getFirebaseAccessToken(serviceAccount);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

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
          // Parse data
          let notifData: Record<string, string> = {};
          if (notif.data) {
            try {
              const parsed = typeof notif.data === "string" ? JSON.parse(notif.data) : notif.data;
              // FCM data must be string values
              for (const [key, value] of Object.entries(parsed)) {
                notifData[key] = String(value);
              }
            } catch {}
          }

          // Send to each device
          for (const device of devices) {
            const message = {
              message: {
                token: device.fcm_token,
                notification: {
                  title: notif.title,
                  body: notif.body,
                },
                data: notifData,
                android: {
                  priority: "high" as const,
                  notification: {
                    channel_id: "casafix_default",
                    sound: "default",
                  },
                },
                apns: {
                  payload: {
                    aps: {
                      sound: "default",
                      badge: 1,
                      "content-available": 1,
                    },
                  },
                },
              },
            };

            const response = await fetch(fcmUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(message),
            });

            if (response.ok) {
              sentCount++;
            } else {
              const errorData = await response.json();
              console.error(`FCM error for ${device.fcm_token}:`, JSON.stringify(errorData));
              failedCount++;

              // Clean up invalid tokens
              if (errorData?.error?.details?.some((d: any) => d.errorCode === "UNREGISTERED")) {
                await supabase.from("user_devices").delete().eq("fcm_token", device.fcm_token);
              }
            }
          }
        }

        // Mark as sent
        await supabase
          .from("notification_queue")
          .update({ sent: true })
          .eq("id", notif.id);
      } catch (err) {
        console.error(`Error processing ${notif.id}:`, err);
        failedCount++;
        await supabase
          .from("notification_queue")
          .update({ sent: true })
          .eq("id", notif.id);
      }
    }

    return new Response(
      JSON.stringify({ processed: notifications.length, sent: sentCount, failed: failedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fatal error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
