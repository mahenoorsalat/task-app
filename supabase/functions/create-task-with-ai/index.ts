// supabase/functions/create-task-with-ai/index.ts (FINAL GEMINI FIX)

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
// --- CHANGE 1: Use Gemini SDK ---
import { GoogleGenAI } from "npm:@google/genai";

// Load environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// --- CHANGE 2: Load the Gemini API Key Secret ---
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY"); 

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();

    console.log("🔄 Creating task with Gemini AI suggestions...");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Initialize Supabase client
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get user session
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("No user found");
    
    // --- CHANGE 3: Initialize Gemini Client and Check Key ---
    if (!GEMINI_API_KEY) {
        // This error will now be returned if the secret is missing.
        throw new Error("GEMINI_API_KEY is missing from Supabase secrets."); 
    }
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    // ---

    // AI instruction for structured JSON output
    const systemInstruction = `You are a task management assistant. Analyze the task title and description. You MUST respond with a single JSON object.
    
    The JSON object must have the following structure:
    {
      "title": "A concise title for the task (use the user's title if perfect)",
      "description": "The detailed description (use the user's description if provided)",
      "label": "Suggest ONE of these labels: work, personal, priority, shopping, home. Default to 'personal' if unsure.",
      "due_date": "The due date in YYYY-MM-DD format if mentioned (e.g., '2025-12-31'). If no date is mentioned, use null."
    }
    
    Use the provided title and description as the basis for your answer.`;

    const userContent = `Task Title: "${title}"\nTask Description: "${description}"`;

    // --- CHANGE 4: Call Gemini API with JSON Schema ---
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // Excellent, fast model for parsing
        contents: userContent,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    label: { type: "string" },
                    due_date: { type: "string", nullable: true }
                },
                required: ["title", "label"]
            },
            temperature: 0.2,
        }
    });

    const aiContent = response.text.trim();

    let parsedTask: any;
    try {
      parsedTask = JSON.parse(aiContent);
    } catch (parseError) {
      console.error("Failed to parse Gemini JSON. Using fallback data.", parseError);
      // Fallback: Use initial input if AI parsing fails
      parsedTask = { title: title, description: description, label: null, due_date: null };
    }
    
    // --- ROBUSTNESS: Ensure data integrity with defaults ---
    const finalTitle = parsedTask.title || title;
    const finalDescription = parsedTask.description || description;
    
    // Validate and default label
    const validLabels = ["work", "personal", "priority", "shopping", "home"];
    const suggestedLabel = parsedTask.label?.toLowerCase();
    const labelToInsert = validLabels.includes(suggestedLabel) ? suggestedLabel : 'personal';

    // Validate and default due_date
    let dateToInsert = null;
    if (parsedTask.due_date && /^\d{4}-\d{2}-\d{2}$/.test(parsedTask.due_date)) {
        dateToInsert = parsedTask.due_date;
    }


    // --- Perform a single, robust INSERT with all fields ---
    const { data: insertedTask, error: insertError } = await supabaseClient
      .from("tasks")
      .insert({
        title: finalTitle,
        description: finalDescription,
        completed: false,
        user_id: user.id,
        label: labelToInsert,
        due_date: dateToInsert,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`✨ Successfully created task ID: ${insertedTask.task_id}`);

    return new Response(JSON.stringify(insertedTask), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error("Error in create-task-with-ai:", error.message);
    return new Response(JSON.stringify({ message: error.message || "Internal Server Error" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});