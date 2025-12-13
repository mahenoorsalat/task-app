import {
  setUserSubscriptionTier,
  setTasksCreatedCount,
  TASK_LIMITS,
} from "../test-utils/limit-testing-utils";

import {
  TestUser,
  getOrCreateTestUser,
  cleanupTestUser,
  createTask,
} from "../test-utils/user-testing-utils";

const TEST_USER_FRANK = {
  name: "Frank (Test User)",
  email: "test-user.frank@pixegami.io",
  password: "Test123!@#Frank",
};

describe("Suite 5: Task Limits and Premium Features", () => {
  let testUser: TestUser;
  beforeAll(async () => {
    testUser = await getOrCreateTestUser(TEST_USER_FRANK);
  });

  afterAll(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  test("free user can create task", async () => {
    await setUserSubscriptionTier(testUser.id, "free");
    await setTasksCreatedCount(testUser.id, 0);
    const { error: errorBelowLimit } = await createTask(testUser, "Free Task");
    expect(errorBelowLimit).toBeFalsy();
  });

  test("free user cannot exceed task limit", async () => {
    await setUserSubscriptionTier(testUser.id, "free");
    await setTasksCreatedCount(testUser.id, TASK_LIMITS.FREE_TIER);
    const { error: errorAtLimit } = await createTask(
      testUser,
      "Free Task (Should fail at limit)"
    );
    expect(errorAtLimit).toBeTruthy();
  });

  test("premium user can exceed free tier", async () => {
    await setUserSubscriptionTier(testUser.id, "premium");
    await setTasksCreatedCount(testUser.id, TASK_LIMITS.FREE_TIER);
    const { error: errorAboveLimit } = await createTask(
      testUser,
      "Premium Task"
    );
    expect(errorAboveLimit).toBeFalsy();
  });

  test("premium user cannot exceed premium limit", async () => {
    await setUserSubscriptionTier(testUser.id, "premium");
    await setTasksCreatedCount(testUser.id, TASK_LIMITS.PREMIUM_TIER);
    const { error: errorAboveLimit } = await createTask(
      testUser,
      "Premium Task (Should fail at limit)"
    );
    expect(errorAboveLimit).toBeTruthy();
  });
});
