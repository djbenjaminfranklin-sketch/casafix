// Supabase Edge Function: Release payment to artisan
// Called after 48h hold expires (auto-confirm) or when client confirms work
// Transfers the captured funds to the artisan's Stripe connected account
//
// Deploy with: supabase functions deploy release-payment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { booking_id } = await req.json();
    if (!booking_id) throw new Error("booking_id is required");

    // Get the booking details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        id, status, proposed_price, final_price,
        stripe_payment_intent_id,
        artisan:artisans(id, stripe_account_id)
      `
      )
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    // Only release for completed bookings
    if (booking.status !== "completed") {
      throw new Error(`Cannot release: booking status is ${booking.status}`);
    }

    const artisan = booking.artisan as any;
    if (!artisan?.stripe_account_id) {
      // If artisan has no Stripe connected account yet, just mark as released
      await supabase
        .from("bookings")
        .update({ payment_released_at: new Date().toISOString() })
        .eq("id", booking_id);

      return new Response(
        JSON.stringify({
          success: true,
          note: "No Stripe connected account, marked as released",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const amount = booking.final_price || booking.proposed_price;
    if (!amount) throw new Error("No amount to transfer");

    // Calculate platform fee (e.g., 15%)
    const PLATFORM_FEE_PERCENT = 15;
    const amountCents = Math.round(amount * 100);
    const feeCents = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100));
    const transferAmount = amountCents - feeCents;

    // Create a transfer to the artisan's connected account
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: "eur",
      destination: artisan.stripe_account_id,
      transfer_group: `booking_${booking_id}`,
      metadata: {
        booking_id,
        total_amount: amountCents,
        platform_fee: feeCents,
      },
    });

    // Mark payment as released
    await supabase
      .from("bookings")
      .update({ payment_released_at: new Date().toISOString() })
      .eq("id", booking_id);

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: transfer.id,
        amount_transferred: transferAmount / 100,
        platform_fee: feeCents / 100,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
