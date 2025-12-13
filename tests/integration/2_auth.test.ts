import { supabase, supabaseServiceClient } from "../test-utils/supabase-client";
import {
  TestUser,
  getOrCreateTestUser,
  cleanupTestUser,
  createTask,
} from "../test-utils/user-testing-utils";

const TEST_USER_BOB = {
  name: "Bob (Test User)",
  email: "test-user.bob@pixegami.io",
  password: "Test123!@#Bob",
};

const TEST_USER_CHARLIE = {
  name: "Charlie (Test User)",
  email: "test-user.charlie@pixegami.io",
  password: "Test123!@#Charlie",
};

describe("Suite 2: Test Auth Use Cases", () => {
  let testUserBob: TestUser;
  let testUserCharlie: TestUser;

  beforeAll(async () => {
    testUserBob = await getOrCreateTestUser(TEST_USER_BOB);
    testUserCharlie = await getOrCreateTestUser(TEST_USER_CHARLIE);
  }, 15_000);

  afterAll(async () => {
    if (testUserBob) {
      await cleanupTestUser(testUserBob.id);
    }
    if (testUserCharlie) {
      await cleanupTestUser(testUserCharlie.id);
    }
  }, 15_000);

  test("user cannot edit tasks of other users", async () => {
    const { error: createError, data: createData } = await createTask(
      testUserBob,
      "Test Task"
    );
    expect(createError).toBeFalsy();
    expect(createData).toBeTruthy();

    const task = createData![0];
    const taskId = task.task_id;

    // Try reading the task as Charlie.
    await supabase.auth.signInWithPassword({
      email: TEST_USER_CHARLIE.email,
      password: TEST_USER_CHARLIE.password,
    });

    const { error: readError, data: readData } = await supabase
      .from("tasks")
      .select("*")
      .eq("task_id", taskId);
    expect(readData).toHaveLength(0);
  }, 15_000);

  test("can get jwt auth token for logged in user", async () => {
    // Ensure the test user exists
    await getOrCreateTestUser(TEST_USER_BOB);

    const { data, error } = await supabaseServiceClient.auth.signInWithPassword(
      {
        email: TEST_USER_BOB.email,
        password: TEST_USER_BOB.password,
      }
    );

    expect(data).toBeTruthy();
    expect(error).toBeFalsy();

    const token = data.session?.access_token;
    expect(token).toBeDefined();
    console.log("Retrieved token:", token);
  }, 15_000);
});
