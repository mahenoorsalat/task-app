# Tutorial 6B: Stripe Integration

This tutorial implements Stripe subscriptions in our TaskApp, building on the Stripe setup from Tutorial 6A. We'll create the database schema, implement edge functions for payment processing, and wire everything up to our frontend.

## Apply Database Migrations

First, we'll apply two SQL migrations that set up our Stripe integration:

```bash
supabase db push
```

### Understanding the Migrations

#### 1. Stripe Integration (7_init_stripe_integration.sql)
- Creates Stripe wrapper and foreign data tables
- Implements triggers for automatic Stripe customer creation/deletion
- Sets up security policies for Stripe data access

#### 2. Secrets Configuration (8_init_secrets.sql)
```sql
insert into vault.secrets (name, secret)
select 'stripe', 'sk_test_xxx'
where not exists (
    select 1 from vault.secrets where name = 'stripe'
)
returning key_id;
```

Update the secret with your actual Stripe API secret key from Tutorial 6A.This migration will add a new field into the `vaults.secrets` which is a pre-existing Supabase DB. You only need to run this once, and it will make the secret key available for your trigger to use.

However, do NOT commit this secret key to your repo — just run it once and delete the file, or undo it back into this 'sk_test_xxx' placeholder after you run the migration once.

## Create Edge Functions

We need two edge functions for Stripe integration:

### 1. Create Stripe Session Function

We'll need this to make the **Manage Subscription** button work for users.

```bash
# Remember to set your $PROJECT_ID or replace it here.

# This is how you'd normally create the function.
supabase functions new create-stripe-session

# But if you already have the function from this commit, then just deploy it.
supabase functions deploy create-stripe-session --project-ref $PROJECT_ID
```

Key implementation points in `supabase/functions/create-stripe-session/index.ts`:
- Authenticates the user
- Fetches user's Stripe customer ID
- Creates checkout session for new subscribers
- Creates portal session for existing subscribers
- Returns session URL for frontend redirect

### 2. Stripe Webhook Handler

This function will be served at the endpoint we specified for our webhook in 6A: `https://[YOUR-PROJECT-ID].supabase.co/functions/v1/stripe-webhook`. Stripe will use this to tell us when a new user joins, a payment fails, or a subscription has ended.

We will then use those events to update things on our end.

```bash
supabase functions deploy stripe-webhook --project-ref $PROJECT_ID
```


Key implementation points in `supabase/functions/stripe-webhook/index.ts`:
- Verifies Stripe webhook signature
- Handles checkout.session.completed event
- Handles customer.subscription.deleted event
- Updates user subscription status in database

Note: We don't actually handle the `invoice.payment_failed` here. But normally that should happen when a payment method fails (but before the subscription is cancelled). This gives us a chance to tell users, before cancelling their account. I left it out for simplicity, but it's something you can try to implement if you'd like.

### Disable JWT Verifiction for Stripe Webhook Function

Disable JWT verification for the webhook function in your Supabase dashboard, as it receives requests directly from Stripe. If you don't do this, the functions will fail with `Unauthorized` errors.

Go to Supabase Dashboard **Edge Functions > stripe-webhook > Details > Enforce JWT Verification** and disable it.

### Set Function Secrets

```bash
# Set required secrets for both functions
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_PRICE_ID=price_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Update `useSubscription` Hook

The frontend integration uses the `useSubscription` hook to manage subscriptions (via our `create-stripe-session` edge function):

```tsx
const manageSubscription = async (accessToken: string) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-stripe-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const { url, error } = await response.json();
  if (error) throw new Error(error);
  
  window.location.href = url;
};
```

This redirects users to either:
- Stripe Checkout (new subscribers)
- Customer Portal (existing subscribers)

## Integration Testing

Tests are implemented in `tests/integration/6_payments.test.ts`. They test against your real webhook endpoint, by sending synthetic Stripe events to mimic checkout and subscription deletion. 

Only two cases are tested (but it's already quite a complex flow):

* A checkout event will upgrade a user to premium.
* A subscription deleted event will downgrade a user to free.

In our tests, we will need the Stripe library, so let's install it.

```sh
npm install stripe --save-dev
```

Run the tests:
```bash
npm test tests/integration/6_payments.test.ts
```

If tests fail with `Expected: 200, Received: 401` then you check if you've disabled `Enforce JWT Verification` for your edge function.