import { createClient } from "@supabase/supabase-js";

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_KEY ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) {
  throw new Error("Missing required Supabase environment variables");
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const supabaseServiceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
