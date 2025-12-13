import { supabase } from "../test-utils/supabase-client";
import {
  TestUser,
  getOrCreateTestUser,
  cleanupTestUser,
} from "../test-utils/user-testing-utils";

const TEST_USER_EMMA = {
  name: "Emma (Test User)",
  email: "test-user.emma@pixegami.io",
  password: "Test123!@#Emma",
};

const CREATE_TASK_WITH_AI_ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-task-with-ai`;

describe("Suite 4: Create Task with AI (Edge Function)", () => {
  let testUser: TestUser;

  beforeAll(async () => {
    testUser = await getOrCreateTestUser(TEST_USER_EMMA);
  });

  afterAll(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  test("can create a task with ai", async () => {
    // We will create a task via the edge function,
    // which should invoke AI to suggest a label for the task.
    const taskTitle = "Generate TPS Reports (Test Task with AI)";
    const expectedLabel = "work";

    await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: testUser.password,
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No session found");

    const response = await fetch(CREATE_TASK_WITH_AI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        title: taskTitle,
        description: "Test task",
      }),
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.task_id).toBeTruthy();
    expect(result.label).toBe(expectedLabel);

    console.log(
      `✅ AI Suggested Label: ${result.label} (expected: ${expectedLabel})`
    );
  }, 10_000); // 10 seconds timeout, it's a bit slow.
});
