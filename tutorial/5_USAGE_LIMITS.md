# Tutorial 4: Usage Limits (Triggers)

If we want to be able to have free/premium tiers based on app usage, we'll need a way to track customer usage, and to limit access based on that.

The goal of this section is to implement usage limits and enforcement for task creation:

* Free users can create 100 tasks per month
* Premium users can create 10,000 tasks per month.

## Usage Tracking Strategy

One possible way to track usage is by using a field in the user's profile (e.g. `tasks_created`), which is reset once a month. It's a simpler model, but I have two issues with that: 

1. Resetting usage to 0 is a destructive operation (we lose history of previous month usage).
2. It doesn't scale well with number of users (even inactive ones).

So instead, I've decided to use a separate table to store usage information. It will use a primary key of `(user_id, year_month)`, so for any given month, we can instantly check a customer's usage in O(1) time. We also don't need to reset the counters, because over time the `year_month` portion will already serve that function for us. Data will accumulate over time, but it's likely not going to be our scaling bottleneck.

## SQL Migration: Usage Tracking Table

First, we will create a new table to track task usage (see `supabase/migrations/4_init_usage_tracking.sql`).

```sql
create table public.usage_tracking (
  user_id uuid references public.profiles on delete cascade,
  year_month text,
  tasks_created integer default 0,
  primary key (user_id, year_month)
);
```

We also also apply some rules and triggers:

* Users can read their own usage tracking data (to show how many tasks they've used), but cannot modify it themselves. Only the service role (our server) will be able to modify it.
* Whenever a user creates a task, the usage value for that period (YYYY-MM) is incremented.

## SQL Migration: Task Limits

Our next migration `supabase/migrations/5_init_task_limit_triggers.sql` will enforce that when a user is at their limit, they are not able to create new tasks.

It will query the `usage_tracking` table for the current's month usage, and compare it against the `tasks_limit` that we store in the user's `profiles` table.

## SQL Migration: Account Tier Triggers

Finally, we will create a trigger so that whenever the user's `subscription_plan` field changes, it will also update the limit. This way, if we want to implement any free/premium products, we only need to worry about changing one field in one place.

* Changing from `free` to `premium` sets `tasks_limit` to `10_000`.
* Changing from `premium` to `free` sets `tasks_limit` to `100`.

This is a simple, straightforward trigger. But it does have some opportunities for extension. For example, what happens when the user's subscription expires mid-month (e.g. mid April)? The `tasks_created` are bucketed into months, so they might have 500 tasks created so far, and then suddenly see their limit reset to 100, making them unable to create tasks for the rest of April. 

One easy solution is to also make the trigger reset `tasks_created` to 0. But that would that cause any secondary issues?

## Testing

New integration tests for task limits and premium/free tiers are created in `tests/integration/5_task_limits.test.ts`. We want to test these specific cases:

* Free user can create tasks (when within limit).
* Free user cannot exceed free task limit (100).
* Premium user can exceed free tier limit.
* Premium user cannot exceed premium task limit (10,000).

We've also added a utility file (`tests/test-utils/limit-testing-utils.ts`) to override values for user subscriptions and task usage (requires the Supabase service role).

```sh
# Run the test suite.
npm test tests/integration/5_task_limits.test.ts
```

This far into the application, I find it's easier to validate application logic via integration tests first. Once you know it's working, then you can implement it with the rest of the app.

## Update `useAuth` Hook

The `` hook is responsible for fetching data about a user's profile (include their usage and limits). We need to update it to get data from the new table as well.

```tsx
// Query the profile and usage data in parallel.
const [profileResponse, usageResponse] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", userId).single(),
    supabase
        .from("usage_tracking")
        .select("tasks_created")
        .eq("user_id", userId)
        .eq("year_month", new Date().toISOString().slice(0, 7))
        .maybeSingle(),
]);
```

```tsx
// Combine them to display the profile and curren usage.
setUser({
    ...profileResponse.data,
    email: userEmail,
    tasks_created: usageResponse.data?.tasks_created || 0,
});
```

Now when you go back and test the app on `localhost` and go to the **Profile** page you should see the task usage (tasks created) updated whenever you create a new task.

If you want to test the UX for when a user is at their limit, just comment out the `afterAll` method in `tests/integration/5_task_limits.test.ts` and run a single test to create a user with exceeded limits.

```sh
npm test tests/integration/5_task_limits.test.ts -- -t "free user cannot exceed task limit"
```

Then just go and log in using the test user's credential.

```tsx
const TEST_USER_FRANK = {
  email: "test-user.frank@pixegami.io",
  password: "Test123!@#Frank",
};
```
