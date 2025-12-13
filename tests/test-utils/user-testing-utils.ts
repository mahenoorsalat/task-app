import { supabase, supabaseServiceClient } from "./supabase-client";

export interface TestUser {
  id?: string;
  name?: string;
  email: string;
  password: string;
}

export async function getOrCreateTestUser(
  userConfig: TestUser
): Promise<TestUser> {
  // Try to sign in first
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: userConfig.email,
      password: userConfig.password,
    });

  // If user exists, return it
  if (signInData.user) {
    return {
      id: signInData.user.id,
      email: userConfig.email,
      password: userConfig.password,
    };
  }

  // If user doesn't exist, create it
  const {
    data: { user },
    error,
  } = await supabase.auth.signUp({
    email: userConfig.email,
    password: userConfig.password,
    options: {
      data: {
        name: userConfig.id,
      },
    },
  });

  if (error) throw error;
  if (!user) throw new Error("User creation failed");

  console.log(`✅ Created test user: ${userConfig.email}`);
  return {
    id: user.id,
    email: userConfig.email,
    password: userConfig.password,
  };
}

export async function cleanupTestUser(userId: string | undefined) {
  if (!userId) return;
  const { error } = await supabaseServiceClient.auth.admin.deleteUser(userId);
  if (error) {
    console.error(`❌ Failed to delete test user: ${userId}`, error);
  } else {
    console.log(`✅ Deleted test user: ${userId}`);
  }
}

export async function createTask(user: TestUser, title: string) {
  const randomString = Math.random().toString(36).substring(2, 14);
  const newTitle = `${title}-${randomString}`;

  await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  return await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: newTitle,
      description: "Test task",
    })
    .select();
}
