// Supabase Edge Function: Charge the remaining amount after deposit
// When the artisan's price exceeds the deposit, we charge the difference
// Deploy with: supabase functions deploy charge-remaining

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

    const { booking_id, remaining_amount, currency } = await req.json();

    // Get the original PaymentIntent to reuse the payment method
    const { data: booking } = await supabase
      .from("bookings")
      .select("stripe_payment_intent_id")
      .eq("id", booking_id)
      .single();

    if (!booking?.stripe_payment_intent_id) {
      throw new Error("No original payment found for this booking");
    }

    const originalPI = await stripe.paymentIntents.retrieve(
      booking.stripe_payment_intent_id
    );

    // Create a new PaymentIntent for the remaining amount
    // Using the same payment method from the original pre-auth
    const paymentIntent = await stripe.paymentIntents.create({
      amount: remaining_amount, // in cents
      currency: currency || "eur",
      payment_method: originalPI.payment_method as string,
      confirm: true, // charge immediately
      off_session: true, // client already accepted in-app
      metadata: {
        booking_id,
        client_id: user.id,
        type: "remaining_charge",
        original_payment_intent: booking.stripe_payment_intent_id,
      },
    });

    // Save the additional payment intent ID
    await supabase
      .from("bookings")
      .update({
        stripe_remaining_payment_id: paymentIntent.id,
      })
      .eq("id", booking_id);

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
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
