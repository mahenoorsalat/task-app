-- Enable the Stripe FDW extension first (REQUIRED)
CREATE EXTENSION IF NOT EXISTS stripe_fdw;

-- 1. Foreign Data Wrapper (FDW) Setup
-- This creates a wrapper that connects PostgreSQL to the Stripe API.
create foreign data wrapper stripe_wrapper
  handler stripe_fdw_handler
  validator stripe_fdw_validator;

-- 2. Create the Foreign Server
-- Replace [YOUR_STRIPE_SECRET_KEY] with your actual Stripe Secret Key.
create server stripe_server
  foreign data wrapper stripe_wrapper
  options (
    api_key '[YOUR_STRIPE_SECRET_KEY]'
  );

-- 3. Create Foreign Tables
-- These tables map to Stripe API resources.

-- Prices Table (for subscription prices)
create foreign table stripe_prices (
  id text not null,
  active boolean,
  billing_scheme text,
  currency text,
  product text,
  recurring_aggregate_usage text,
  recurring_interval text,
  recurring_interval_count integer,
  recurring_usage_type text,
  tiers_mode text,
  type text,
  unit_amount bigint
)
  server stripe_server
  options (
    resource 'prices',
    row_key 'id'
  );

-- Customers Table (for linking Supabase users to Stripe customers)
create foreign table stripe_customers (
  id text not null,
  email text,
  name text,
  metadata jsonb
)
  server stripe_server
  options (
    resource 'customers',
    row_key 'id',
    'create' 'true', -- Allow creating new customers on INSERT
    'search_parameters' 'email' -- Index on email for lookups
  );

-- Checkout Sessions Table (for creating new subscription sessions)
create foreign table stripe_checkout_sessions (
  id text not null,
  client_reference_id text,
  customer text,
  mode text,
  price text,
  success_url text,
  cancel_url text,
  url text,
  status text,
  expires_at timestamp with time zone
)
  server stripe_server
  options (
    resource 'checkout_sessions',
    row_key 'id',
    'create' 'true'
  );

-- Subscriptions Table (to check the status of a user's subscription)
create foreign table stripe_subscriptions (
  id text not null,
  customer text,
  status text,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean,
  plan_id text,
  price_id text
)
  server stripe_server
  options (
    resource 'subscriptions',
    row_key 'id'
  );