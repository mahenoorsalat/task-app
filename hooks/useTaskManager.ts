// hooks/useTaskManager.ts (NO CHANGE)

import { useState, useEffect } from "react";
import { Task } from "@/types/models";
import { createBrowserClient } from '@supabase/ssr'
import {
  TaskState,
  TasksState,
  TaskOperations,
  TasksOperations,
} from "@/types/taskManager";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const FUNCTION_ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-task-with-ai`;

interface UseTaskManagerReturn
  extends TaskState,
    TasksState,
    TaskOperations,
    TasksOperations {}

export function useTaskManager(taskId?: string): UseTaskManagerReturn {
  // State for single task management
  const [task, setTask] = useState<Task | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);

  // State for task list management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch single task
  useEffect(() => {
    if (!taskId) return;

    const fetchTask = async () => {
      try {
        const { data: task, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("task_id", taskId)
          .single();

        if (error) throw error;
        setTask(task);
        setDate(task.due_date ? new Date(task.due_date) : undefined);
      } catch (error: any) {
        console.error(`Error fetching task ID ${taskId}:`, error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  // Fetch all tasks
  useEffect(() => {
    if (taskId) return; // Don't fetch all tasks if we're managing a single task
    fetchTasks();
  }, []);

  // Single task operations
  const updateTask = (updates: Partial<Task>) => {
    setTask((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const saveTask = async (taskToSave?: Task) => {
    try {
      const taskData = taskToSave || task;
      if (!taskData) throw new Error("No task data to save");

      const { error } = await supabase
        .from("tasks")
        .update({
          ...taskData,
          due_date: date?.toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("task_id", taskData.task_id);

      if (error) throw error;
    } catch (error: any) {
      console.error("Error saving task:", error);
      setError(error.message);
      throw error;
    }
  };

  const uploadImage = async (file: File) => {
    try {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File size must be less than 1MB");
      }

      if (!task) throw new Error("No task found");

      const fileExt = file.name.split(".").pop();
      const fileName = `${task.user_id}/${task.task_id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type,
          duplex: "half",
          headers: {
            "content-length": file.size.toString(),
          },
        });

      if (uploadError) throw uploadError;

      const updatedTask = { ...task, image_url: fileName };
      setTask(updatedTask);
      await saveTask(updatedTask);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      setError(error.message);
      throw error;
    }
  };

  const removeImage = async () => {
    try {
      if (!task?.image_url) throw new Error("No image to remove");

      const fileName = task.image_url;
      const { error: storageError } = await supabase.storage
        .from("task-attachments")
        .remove([fileName]);

      if (storageError) throw storageError;

      const updatedTask = { ...task, image_url: null };
      setTask(updatedTask);
      await saveTask(updatedTask);
    } catch (error: any) {
      console.error("Error removing image:", error);
      setError(error.message);
      throw error;
    }
  };

  // Task list operations
  const fetchTasks = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", session!.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
      setError(null);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

const createTask = async (title: string, description: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(FUNCTION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session!.access_token}`,
        },
        body: JSON.stringify({ title, description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // FIX: Check both 'message' (from fixed server code) and 'error' (from original server code) keys
        const errorMessage = errorData.message || errorData.error || "Failed to create task";
        throw new Error(errorMessage);
      }

      const taskData = await response.json();
      if (!taskData) throw new Error("No data returned from server");

      setTasks([taskData, ...tasks]);
      setError(null);
      return taskData;
    } catch (error: any) {
      console.error("Error creating task:", error);
      setError(error.message);
      throw error;
    }
  };

  const deleteTask = async (taskIdToDelete: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("task_id", taskIdToDelete);

      if (error) throw error;
      setTasks(tasks.filter((t) => t.task_id !== taskIdToDelete));
      setError(null);
    } catch (error: any) {
      console.error("Error deleting task:", error);
      setError(error.message);
      throw error;
    }
  };

  const toggleTaskComplete = async (
    taskIdToToggle: string,
    completed: boolean
  ) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed })
        .eq("task_id", taskIdToToggle);

      if (error) throw error;
      setTasks(
        tasks.map((t) =>
          t.task_id === taskIdToToggle ? { ...t, completed } : t
        )
      );
      setError(null);
    } catch (error: any) {
      console.error("Error updating task:", error);
      setError(error.message);
      throw error;
    }
  };

  const refreshTasks = async () => {
    setIsLoading(true);
    await fetchTasks();
  };

  return {
    // State
    task,
    tasks,
    date,
    error,
    isLoading,

    // Single task operations
    setDate,
    updateTask,
    saveTask,
    uploadImage,
    removeImage,

    // Task list operations
    createTask,
    deleteTask,
    toggleTaskComplete,
    refreshTasks,
  };
}