# Tutorial 4: Edge Functions (AI Integration)

Supabase Edge Functions are serverless functions that execute on-demand, in response to HTTP requests. We can use them to run any logic that typically requires a server.

In a typical SaaS app, this is usually where you can implement the core feature that creates value. In our app, we're going to use it to call an LLM service (OpenAI) to automatically categorize new tasks for us.

### Edge Function Technical Detail

- Executes in a Deno (Typescript) environment.
- Can be built/deployed from our project via Supabase CLI.
- We can also configure it by specifying environment variables (which can include server side secrets), either via the Supabase UI or CLI.

### Edge Function Limitation

- 500K free invocations per month (then 2$ per million)
- Cold starts ranging from 200ms to 1500ms
- Max memory: 256MB
- Max function size: 20MB
- Max total runtime: 150s (free) / 400s (paid)
- Max CPU total (not include async/wait operations): 2s

So they are very useful for small, server-side logic and webhooks. But not suitable if you need long-running or compute-intensive tasks.

## Create and Deploy an Edge Function

In this commit, you should already have an edge function in the `supabase/functions` folder. But in a new project, you can create with this command:

```sh
supabase functions new create-task-with-ai
```

The boiler-plate function will come with some instructions on how to call it, and how to [set up the IDE for Deno](https://docs.deno.com/runtime/getting_started/setup_your_environment/) so your autocomplete works.

You can just deploy the hello-world function like this (make sure you replace `$PROJECT_ID` with your project ID).

```sh
supabase functions deploy create-task-with-ai --project-ref $PROJECT_ID
```

It will now have a URL endpoint like `https://[your-project-id].supabase.co/functions/v1/create-task-with-ai`. But if you visit it, it will fail because you are not authenticated.

## Testing an Edge Function via cURL

If you wanted, you can actually pass the authentication and test the function by adding the JWT token of an authorized user to the request.

Luckily, one of our tests can produce that for us. The token should last a few hours.

```sh
npm test tests/integration/2_auth.test.ts -- -t "can get jwt auth token"
```

Copy the token (it's a really long string) and update this request with your URL and token:

```sh
# Set environment variables.
export FUNCTION_ENDPOINT="http://[project-id].supabase.co/functions/v1/create-task-with-ai"
export FUNC_JWT_TOKEN=" eyJBUXXXX..."

# Call the function.
curl -i --location \
    --request POST "$FUNCTION_ENDPOINT" \
    --header "Authorization: Bearer $FUNC_JWT_TOKEN" \
    --header 'Content-Type: application/json' \
    --data '{"title":"New Task From Edge Function"}'
```

This should now work.

```text
{"message":"Hello Pixegami!!"} ⏎    
```

## Implementing Edge Function Logic (Partial)

Now we'll update the edge function `supabase/functions/create-task-with-ai/index.ts` with actual service logic. This will:

* Accept HTTP POST requests with a `title` and a `description`.
* Check if the request is authorized (JWT token in header).
* Create a task with the `title` and `description`.
* Apply a `priority` label to the task (we will update this later to use AI).
* Update the task with the new label.

Also, notice that this function needs environment variables `SUPABASE_URL` and `SUPABASE_ANON_KEY`. But we didn't need to set them because there's a few secrets that Supabase adds by default:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
```

The test in `tests/integration/4_ai.test.ts` will test this entire flow by creating a new user. But until the AI logic is implemented, the test will fail because it's expecting the task to be categorized as `work`, but it's actually hard coded to  `priority`.

## Implement OpenAI Integration

### Get an OpenAI API Key

If you don't have an OpenAI account and an OpenAI API key, you have to create one first: https://platform.openai.com/

You can find/create it in **Profile > Project > API Keys**. This is pay-per-use, but the cost is quite cheap—especially with our model and our use case.

You can also use any other LLM as well of course, but you'll have to know how to set it up with this project.

### Set OpenAI Key as Edge Function Secret

```sh
supabase secrets set OPENAI_API_KEY="sk-xxx..."
```

This can be verified in your accounts settings, or by:

```sh
supabase secrets list
```

### Update Edge Function

Update the edge function code to use this secret key, create an OpenAI client, and make the call to find the right label for our task.

```tsx
// See supabase/functions/create-task-with-ai for full implementation.

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

// Get label suggestion from OpenAI
const prompt = `Based on this task title: "${title}" and description: "${description}", suggest ONE of these labels: work, personal, priority, shopping, home. Reply with just the label word and nothing else.`;

const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 16,
});
```

Deploy the function again. Run the tests. They should now pass.

If you need to debug your functions, you can find metrics and logs in your Supabase console. Go to **Edge Functions > [Your Function] > Logs** or **Invocations**.

## Call Edge Function From App

Finally, to wire it up with our app's UI, let's just update the client code to call this edge function instead of calling the database directly.

See `hooks/useTaskManager.ts` for full code update:

```tsx
const FUNCTION_ENDPOINT = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-task-with-ai`;

const response = await fetch(FUNCTION_ENDPOINT, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session!.access_token}`,
    },
    body: JSON.stringify({ title, description }),
});
```

Your local development server should how use this edge function to create tasks, and they should have automatic AI labels.