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

    // Get artisan's Stripe account ID
    const { data: artisan } = await supabase
      .from("artisans")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    if (!artisan?.stripe_account_id) {
      throw new Error("No Stripe account found");
    }

    // Create a login link to the Express Dashboard
    const loginLink = await stripe.accounts.createLoginLink(
      artisan.stripe_account_id
    );

    return new Response(
      JSON.stringify({ url: loginLink.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
