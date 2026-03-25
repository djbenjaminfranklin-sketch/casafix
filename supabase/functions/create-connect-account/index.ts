// Supabase Edge Function: Create a Stripe Connect account for an artisan
// Deploy with: supabase functions deploy create-connect-account
// Secret needed: STRIPE_SECRET_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization")!;
    const { data: { user } } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!user) throw new Error("Not authenticated");

    const { artisan_id, return_url, refresh_url } = await req.json();

    // Get artisan info
    const artisanUserId = artisan_id || user.id;
    const { data: artisan } = await supabase
      .from("artisans")
      .select("stripe_account_id, full_name, country")
      .eq("id", artisanUserId)
      .single();

    let accountId = artisan?.stripe_account_id;

    if (!accountId) {
      // Create a new Stripe Connect Express account
      const country = artisan?.country === "ES" ? "ES" : "FR";
      const account = await stripe.accounts.create({
        type: "express",
        country,
        email: user.email,
        business_type: "individual",
        individual: {
          first_name: artisan?.full_name?.split(" ")[0] || "",
          last_name: artisan?.full_name?.split(" ").slice(1).join(" ") || "",
          email: user.email,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          artisan_id: artisanUserId,
        },
      });

      accountId = account.id;

      // Save to database
      await supabase
        .from("artisans")
        .update({ stripe_account_id: accountId })
        .eq("id", artisanUserId);
    }

    // Create an account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: "https://casafix.fr/stripe/refresh",
      return_url: "https://casafix.fr/stripe/return",
      type: "account_onboarding",
    });

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        accountId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-connect-account error:", error.message, error.stack);
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
