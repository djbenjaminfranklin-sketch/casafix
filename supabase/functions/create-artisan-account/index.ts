// Supabase Edge Function: Create an artisan account for a company
// Deploy with: supabase functions deploy create-artisan-account --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization")!;
    const { data: { user: caller } } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (!caller) throw new Error("Not authenticated");

    // Verify caller owns a company
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", caller.id)
      .single();

    if (!company) throw new Error("You are not a company owner");

    const { full_name, email, phone, categories } = await req.json();

    if (!full_name || !email || !phone) {
      throw new Error("Missing required fields");
    }

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-10) + "A1!";

    // Create user with admin API (doesn't affect caller's session)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name, role: "artisan" },
    });

    if (createError) throw new Error(createError.message);

    // Create artisan profile
    const { error: profileError } = await supabase.from("artisans").insert({
      id: newUser.user.id,
      full_name,
      phone,
      categories: categories || [],
      radius_km: 15,
      country: "FR",
      is_available: false,
      rating: 0,
      review_count: 0,
      verified: false,
      company_id: company.id,
    });

    if (profileError) throw new Error(profileError.message);

    // Create profile entry
    await supabase.from("profiles").insert({
      id: newUser.user.id,
      full_name,
      phone,
    });

    return new Response(
      JSON.stringify({
        success: true,
        artisanId: newUser.user.id,
        tempPassword,
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
