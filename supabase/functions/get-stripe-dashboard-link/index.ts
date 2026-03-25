// Supabase Edge Function: Get Stripe Express Dashboard link for an artisan
// Deploy with: supabase functions deploy get-stripe-dashboard-link

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
    // Parse body ONCE at the top before anything else
    const body = await req.json().catch(() => ({}));
    const { artisan_id, return_url, refresh_url } = body;

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
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Use artisan_id from body if provided, otherwise fall back to user.id
    const lookupId = artisan_id || user.id;

    // Get artisan's Stripe account ID
    const { data: artisan, error: artisanError } = await supabase
      .from("artisans")
      .select("stripe_account_id")
      .eq("id", lookupId)
      .single();

    if (artisanError) {
      throw new Error(`Artisan lookup failed for id=${lookupId}: ${artisanError.message}`);
    }

    if (!artisan?.stripe_account_id) {
      throw new Error(`No Stripe account found for artisan id=${lookupId}`);
    }

    // Try creating a login link to the Express Dashboard
    try {
      const loginLink = await stripe.accounts.createLoginLink(
        artisan.stripe_account_id
      );
      return new Response(
        JSON.stringify({ url: loginLink.url }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (stripeError: any) {
      // Account not fully onboarded — send onboarding link instead
      console.log(
        `createLoginLink failed for ${artisan.stripe_account_id}: ${stripeError.message}. Falling back to onboarding link.`
      );
      const accountLink = await stripe.accountLinks.create({
        account: artisan.stripe_account_id,
        refresh_url: "https://casafix.fr/stripe/refresh",
        return_url: "https://casafix.fr/stripe/return",
        type: "account_onboarding",
      });
      return new Response(
        JSON.stringify({ url: accountLink.url, type: "onboarding" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("get-stripe-dashboard-link error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
