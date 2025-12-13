import { supabase } from "../test-utils/supabase-client";
import {
  TestUser,
  getOrCreateTestUser,
  cleanupTestUser,
  createTask,
} from "../test-utils/user-testing-utils";

const TEST_USER_ALICE = {
  name: "Alice (Test User)",
  email: "test-user.alice@pixegami.io",
  password: "Test123!@#Alice",
};

describe("Suite 1: Task CRUD", () => {
  let testUser: TestUser;

  beforeAll(async () => {
    testUser = await getOrCreateTestUser(TEST_USER_ALICE);
  });

  afterAll(async () => {
    if (testUser) {
      await cleanupTestUser(testUser.id);
    }
  });

  test("can create a task", async () => {
    const { error, data } = await createTask(testUser, "Test Task");

    expect(error).toBeFalsy();
    expect(data).toBeTruthy();
    const task = data![0];

    // Verify the task was created
    const { data: readData } = await supabase
      .from("tasks")
      .select()
      .eq("task_id", task.task_id);

    expect(readData).toHaveLength(1);
    const readTask = readData![0];
    expect(readTask.title).toContain("Test Task");
    expect(readTask.user_id).toBe(testUser.id);
    console.log(`✅ Task created and verified: ${task.task_id}`);
  });

  test("can update a task", async () => {
    const { error, data } = await createTask(testUser, "Test Task");
    expect(error).toBeFalsy();
    expect(data).toBeTruthy();

    // Update the task with a new title.
    const task = data![0];
    const newTitle = "Updated Task";
    const { error: updateError, data: updatedTaskData } = await supabase
      .from("tasks")
      .update({ title: newTitle })
      .eq("task_id", task.task_id)
      .select();

    expect(updateError).toBeFalsy();
    expect(updatedTaskData).toBeTruthy();

    const updatedTask = updatedTaskData![0];
    expect(updatedTask!.title).toBe(newTitle);
    console.log(`✅ Task updated ${updatedTask!.title}`);
  });

  test("can delete a task", async () => {
    const { error, data } = await createTask(testUser, "Test Task");
    expect(error).toBeFalsy();
    expect(data).toBeTruthy();

    const task = data![0];
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("task_id", task.task_id);
    expect(deleteError).toBeFalsy();

    // Check that the task was deleted.
    const { data: deletedTaskData } = await supabase
      .from("tasks")
      .select()
      .eq("task_id", task.task_id);

    // Should return empty list.
    expect(deletedTaskData).toHaveLength(0);
    console.log(`✅ Task deleted ${task.title}`);
  });
});
