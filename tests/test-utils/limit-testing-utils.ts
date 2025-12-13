import { supabaseServiceClient } from "./supabase-client";

export const TASK_LIMITS = {
  FREE_TIER: 100,
  PREMIUM_TIER: 10_000,
};

export async function setUserSubscriptionTier(
  userId: string | undefined,
  tier: "free" | "premium"
) {
  const { error: profileError } = await supabaseServiceClient
    .from("profiles")
    .update({
      subscription_plan: tier,
    })
    .eq("user_id", userId);

  if (profileError) {
    console.log(`❌ Failed to set subscription tier for user: ${userId}`);
    throw profileError;
  }
}

export async function setTasksCreatedCount(
  userId: string | undefined,
  count: number
) {
  const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  const { error: usageError } = await supabaseServiceClient
    .from("usage_tracking")
    .upsert(
      {
        user_id: userId,
        year_month: yearMonth,
        tasks_created: count,
      },
      {
        onConflict: "user_id,year_month",
      }
    );
  if (usageError) {
    console.log(`❌ Failed to update usage: ${userId} for ${yearMonth}`);
    throw usageError;
  }
  console.log(`🛠️ Set tasks created to ${count} for ${userId}: ${yearMonth}`);
}
