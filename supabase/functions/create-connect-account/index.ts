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

    const { email, full_name, return_url } = await req.json();

    // Check if artisan already has a Stripe account
    const { data: artisan } = await supabase
      .from("artisans")
      .select("stripe_account_id")
      .eq("id", user.id)
      .single();

    let accountId = artisan?.stripe_account_id;

    if (!accountId) {
      // Create a new Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "ES",
        email,
        business_type: "individual",
        individual: {
          first_name: full_name?.split(" ")[0] || "",
          last_name: full_name?.split(" ").slice(1).join(" ") || "",
          email,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          artisan_id: user.id,
        },
      });

      accountId = account.id;

      // Save to database
      await supabase
        .from("artisans")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
    }

    // Create an account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: return_url || "casafixpro://stripe-refresh",
      return_url: return_url || "casafixpro://stripe-return",
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
