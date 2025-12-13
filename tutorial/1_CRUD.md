# Tutorial 1: Add CRUD Functionality

CRUD (Create/Read/Update/Delete) operations will allow us to implement all the basic functionality of the project. It'll let us create, list, edit and delete our task.

## Create Supabase Project

Go to [supabase.com](supabase.com) and sign up.

- Create "New Project"
- Set database password
- Choose region close to you
- Select free tier

Get credentials from Project Settings → Configuration → API:

- Project URL: https://[project-id].supabase.co
- Project Reference: [project-id] (looks like 'abcdefghijklm')
- `anon` `public` Key: starts with `eyJhbGciOiJIUzI1NiIs...`

You'll need these credentials later to set up your NextJS project with Supabase.

Create a file called `.env.local` and `.env.test.local` and put those variables there. The file won't get committed to Git, but you can refer to `.env.example`.

```sh
NEXT_PUBLIC_SUPABASE_URL="https://XXXX.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="XXXX"
```

## Install Supabase

First, install the Supabase CLI package in your NextJS project:

```bash
npm install supabase --save-dev
```

Initialize Supabase in your project:

```bash
supabase init
```

When prompted about generating IDE settings for Deno, you can answer 'y' (for your IDE). We may need it later for our "edge functions".

Link your project to your remote Supabase instance. You'll need your project reference ID from your Supabase dashboard (it looks like `abcdexxxxxxx`):

```bash
supabase link --project-ref [your-project-ref]
```

## Create Database Schema

Supabase migrations are SQL files that define your database schema changes. In your project, they're located in the `supabase/migrations` directory and are applied in numerical order (e.g., 0_init_profile.sql, 1_init_tasks.sql).

The files can be used to create/modify tables, functions and security policies.

In this project, we've created our first two SQL files:

- `0_init_profile.sql`: This will create the table to store user profile information.
- `1_init_tasks.sql`: After profiles are created, we need a table to store task information. Every task must be owned by a user.

## Apply Database Migrations

In a fresh Supabase project, we can run this command to "execute" the statements in the SQL files. It will execute the files in order.

```sh
# Apply a migration
supabase db push
```

This will apply all **new** files that haven't (ever) been applied before. So if you modify an existing file, it won't be run a second time. You'll have to create a new file and use that to modify/add/delete your database structure.

But if you're not in a production environment, you can actually use this command to nuke the whole database and apply the migrations fresh:

```sh
# Reset and reapply all migrations
supabase db reset --linked
```

I'll be using this a lot during development (since it's cleaner).

## Set Up Supabase Client

Install the Supabase client libraries

```sh
npm install @supabase/supabase-js
npm install @supabase/ssr
```

Since we're using Next.JS and will eventually need auth, we should follow this [documentation](https://supabase.com/docs/guides/auth/server-side/nextjs?router=pages).

This is how we will set up a Supabase client in the _client-side_ components of our pages (as opposed to server-side or build-time components). Our frontend is actually 100% client side though, so this is all we will need.

We can set up this client wherever we need to use Supabase (e.g. `hooks/useTaskManager.ts`):

```tsx
import { createBrowserClient } from "@supabase/ssr";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

## Implement Service Logic

All the code to read/write tasks will be implemented in `hooks/useTaskManager.ts`.

We can use the client to make queries to the database directly.

```tsx
// Create/Insert new task
const { data, error } = await supabase
  .from("tasks")
  .insert({ title, description })
  .select();
```

```tsx
// Fetch a task, given a taskId
const { data: task, error } = await supabase
  .from("tasks")
  .select("*")
  .eq("task_id", taskId)
  .single();
```

Not that we are not making use of the `profile` table, or the task `user_id` at all right now. I only created the profile table so that I can establish the `user_id` as a foreign key right now, but we'll use it later.

This also means that at this stage, there is no concept of task ownership. Anyone can read/write tasks, and everyone will see the same set of tasks.

## Testing

Run the development server (unless it's already running) and go to the dashboard to test task CRUD:

```
npm run dev
```

Go to http://localhost:3000/dashboard and play around with creating/updating tasks.

On your Supabase dashboard, you should also now see your tables and your data: https://supabase.com/dashboard/project/[your-project-id]/editor

## Automated Tests (Jest)

### Setting Up Jest

Install Jest (unit testing framework) and its supporting types.

```sh
npm install --save-dev jest @types/jest ts-jest
```

Next, we'll need a way to configure Jest as well—specifically to have the environment variables so that it can set up a Supabase client for the tests.

1. Create a copy of `.env.local` and call it `.env.test.local`.
2. Create (or update) the Jest configuration and setup scripts to load in those variables. Refer to `jest.config.js` and `jest.setup.js` in this commit to see the code.

The main part are these:

```js
// In jest.config.js
setupFiles: ["<rootDir>/jest.setup.js"];

// In jest.setup.js
dotenv.config({ path: path.resolve(process.cwd(), ".env.test.local") });
```

### Writing a Test Suite

Our first integration test will be implemented in `tests/integration/1_task_crud.test.ts`. If you are new to testing, read here to learn more: https://jestjs.io/docs/getting-started

It's an "integration test" (rather than a unit test) because it will use a real Supabase client to connect to the real project.

```js
// This is the test suite.
describe("Suite 1: Task CRUD", () => {

    const supabase = createClient(...);
    async function createTask(title: string) {
        // A helper function.
    }

    // Implement 3 test cases.
    test("can create a task", async () => { ... });
    test("can update a task", async () => { ... });
    test("can delete a task", async () => { ... });

})
```

In the test, we'll use the Supabase client (which uses the keys in `.env.test.local`) to interact directly with the database to test all of our use cases.

Note that the tests have no set-up or teardown, so any tasks created as part of these tests will pollute the database. We'll fix that later.

### Running Tests

Update package.json to add the `test` command:

```json
"scripts": {
    "dev": "next dev",
    "build": "next build",
    // ...
    "test": "jest"
}
```

Now you can run the entire test suite like this:

```sh
# Run the entire test suite.
npm test
```

```sh
# Run a specific test suite (or file).
npm test tests/integration/1_task_crud.test.ts
```

```sh
# Run a single specific test case.
npm test tests/integration/1_task_crud.test.ts -- -t "can create a task"
```
