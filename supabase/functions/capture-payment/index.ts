// Supabase Edge Function: Capture the final amount on a pre-authorized PaymentIntent
// Deploy with: supabase functions deploy capture-payment
// The artisan sets the final price, we capture only that amount

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

    const { payment_intent_id, final_amount } = await req.json();

    // Capture only the final amount (less than or equal to pre-authorized amount)
    const paymentIntent = await stripe.paymentIntents.capture(payment_intent_id, {
      amount_to_capture: final_amount, // in cents
    });

    // Update the booking with the final price
    await supabase
      .from("bookings")
      .update({
        final_price: final_amount / 100, // convert cents to euros
        status: "completed",
      })
      .eq("stripe_payment_intent_id", payment_intent_id);

    return new Response(
      JSON.stringify({ success: true, status: paymentIntent.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
