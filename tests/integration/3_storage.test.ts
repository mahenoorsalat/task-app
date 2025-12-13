import { supabase } from "../test-utils/supabase-client";
import {
  TestUser,
  getOrCreateTestUser,
  cleanupTestUser,
  createTask,
} from "../test-utils/user-testing-utils";
import fs from "fs/promises";
import path from "path";

const TEST_USER_DAVID = {
  name: "David (Test User)",
  email: "test-user.david@pixegami.io",
  password: "Test123!@#David",
};

const TEST_USER_DOMINIC = {
  name: "Dominic (Test User)",
  email: "test-user.dominic@pixegami.io",
  password: "Test123!@#Dominic",
};

describe("Suite 3: Storage (Task Image Attachments)", () => {
  
  let testUserDavid: TestUser;
  let testUserDominic: TestUser;

  beforeAll(async () => {
    testUserDavid = await getOrCreateTestUser(TEST_USER_DAVID);
    testUserDominic = await getOrCreateTestUser(TEST_USER_DOMINIC);
  }, 15_000);

  afterAll(async () => {
    if (testUserDavid) {
      await cleanupTestUser(testUserDavid.id);
    }
    if (testUserDominic) {
      await cleanupTestUser(testUserDominic.id);
    }
  }, 15_000);

  async function uploadTaskImage(testUser: TestUser, taskId: string) {
    const imagePath = "./tests/data/test_image.png";
    const fileBuffer = await fs.readFile(imagePath);
    const fileName = path.basename(imagePath);
    const fileType = fileName.split(".").pop()?.toLowerCase();
    const mimeType = `image/${fileType}`;
    const storagePath = `${testUser.id}/${taskId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("task-attachments")
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    return { storagePath, uploadError };
  }

  test("can attach image to a task", async () => {
    const { data: taskData } = await createTask(
      testUserDavid,
      "Test Task with Image"
    );
    const task = taskData![0];
    expect(task).toBeTruthy();

    const { storagePath, uploadError } = await uploadTaskImage(
      testUserDavid,
      task.task_id
    );
    expect(uploadError).toBeFalsy();

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ image_url: storagePath })
      .eq("task_id", task.task_id);
    expect(updateError).toBeFalsy();

    // Verify the task was updated with the image
    const { data: updatedTask } = await supabase
      .from("tasks")
      .select()
      .eq("task_id", task.task_id)
      .single();

    expect(updatedTask.image_url).toContain(storagePath);
    console.log(`✅ Task updated with image: ${updatedTask.image_url}`);

    // Check that the image is deleted.
    const { data: readImage } = await supabase.storage
      .from("task-attachments")
      .exists(storagePath);
    expect(readImage).toBeTruthy();

    // Delete the task and verify the image is deleted.
    const { error: deleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("task_id", task.task_id);
    expect(deleteError).toBeFalsy();

    // Check that the image is deleted.
    const { data: deletedImage } = await supabase.storage
      .from("task-attachments")
      .exists(storagePath);
    expect(deletedImage).toBeFalsy();
    console.log(`✅ Task deleted and image deleted: ${task.task_id}`);
  });

  test("cannot attach image to other user's task", async () => {
    // Create a task as the original test user
    const { data: taskData } = await createTask(
      testUserDavid,
      "Test Task for Image Security"
    );
    const task = taskData![0];
    expect(task).toBeTruthy();

    // Log in as Dominic.
    await supabase.auth.signInWithPassword({
      email: TEST_USER_DOMINIC.email,
      password: TEST_USER_DOMINIC.password,
    });

    // Now try to upload an image to David's task path.
    const { storagePath, uploadError } = await uploadTaskImage(
      testUserDavid,
      task.task_id
    );

    // Should fail due to storage permissions
    expect(uploadError).toBeTruthy();
    console.log("✅ Upload to another user's task path was blocked");
  });
});
