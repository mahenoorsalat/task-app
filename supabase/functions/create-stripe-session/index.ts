// supabase/functions/create-stripe-session/index.ts (UPDATED)

import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.0.0";

// Load environment variables
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") as string;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID");

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with Service Role Key for privileged access (to update profiles)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("🔄 Authenticating user...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(
      req.headers.get("Authorization")?.split(" ")[1] ?? ""
    );

    if (authError) {
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!user) {
      throw new Error("No user found");
    }

    // Retrieve user profile data
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, subscription_plan")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.log("Profile retrieval error:", profileError);
      throw profileError;
    }
    
    if (!profile) {
      throw new Error("No profile found");
    }

    let customerId = profile.stripe_customer_id;
    
    // --- FIX: Check and Create Stripe Customer ID if missing ---
    if (!customerId) {
      console.log(`❌ No Stripe customer found for user ${user.id}. Creating new customer...`);
      
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      
      customerId = customer.id;
      
      // Update the user's profile with the new customer ID
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Database update error:", updateError);
        throw new Error(`Failed to save Stripe customer ID to database: ${updateError.message}`);
      }
      console.log(`✅ New Stripe customer ID ${customerId} saved to profile.`);
    }

    const originUrl = req.headers.get("origin") ?? "http://localhost:3000";

    // Create Portal session if already subscribed
    if (profile.subscription_plan === "premium") {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId, // Use the guaranteed customer ID
        return_url: `${originUrl}/profile`,
      });
      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Checkout session for new subscribers
    const session = await stripe.checkout.sessions.create({
      customer: customerId, // Use the guaranteed customer ID
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${originUrl}/profile?success=true`,
      cancel_url: `${originUrl}/profile?canceled=true`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in create-stripe-session:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});