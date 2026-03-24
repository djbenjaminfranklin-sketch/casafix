import { supabase } from "./supabase";

const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51T9YocEWy0fRj2Ur5gI641BK2Bx47hnXKzM0VcIMtpQGHn6L7792HBHOHcecVO912mFMIae8MdY0ZPOGUc0HzE6l00zP8IUOer";

export { STRIPE_PUBLISHABLE_KEY };

// Create a payment intent via Supabase Edge Function
export async function createPaymentIntent(params: {
  bookingId: string;
  amount: number; // in cents
  currency?: string;
}): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  const { data, error } = await supabase.functions.invoke("create-payment-intent", {
    body: {
      booking_id: params.bookingId,
      amount: params.amount,
      currency: params.currency || "eur",
    },
  });

  if (error || !data) {
    console.warn("createPaymentIntent failed:", error, data);
    return null;
  }
  return data;
}

// Capture the real amount after artisan sets the final price
export async function capturePayment(params: {
  paymentIntentId: string;
  finalAmount: number; // in cents
}): Promise<{ success: boolean }> {
  const { data, error } = await supabase.functions.invoke("capture-payment", {
    body: {
      payment_intent_id: params.paymentIntentId,
      final_amount: params.finalAmount,
    },
  });

  if (error) return { success: false };
  return { success: true };
}

// Release payment to artisan after 48h hold or manual confirmation
export async function releaseToArtisan(params: {
  bookingId: string;
}): Promise<{ success: boolean }> {
  const { data, error } = await supabase.functions.invoke("release-payment", {
    body: {
      booking_id: params.bookingId,
    },
  });

  if (error) return { success: false };
  return { success: true };
}

// Charge the remaining amount when price exceeds deposit
// Example: deposit = 150€, final price = 1000€ → charge 850€ more
export async function chargeRemaining(params: {
  bookingId: string;
  remainingAmount: number; // in cents
}): Promise<{ success: boolean }> {
  const { data, error } = await supabase.functions.invoke("charge-remaining", {
    body: {
      booking_id: params.bookingId,
      remaining_amount: params.remainingAmount,
    },
  });

  if (error) return { success: false };
  return { success: true };
}
