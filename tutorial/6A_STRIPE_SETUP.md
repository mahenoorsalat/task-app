# Tutorial 6A: Stripe Setup

Before we can implement Stripe payments in our TaskApp, we need to set up our Stripe account and create all the necessary resources. This tutorial will walk through setting up everything we need in Stripe's test environment.

### Objectives

- Set up a Stripe account for test mode
- Install and configure the Stripe CLI
- Create a subscription product and pricing
- Configure the Customer Portal
- Set up webhooks for subscription lifecycle events
- Get all required API keys and IDs

## Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create a new account
2. Once logged in, make sure you're in **Test Mode** (toggle in the upper right)
3. Note your **test mode API keys** from the dashboard:
   - Find them at: **Developers > API Keys**
   - Save both the **Publishable key** (`pk_test_...`) and **Secret key** (`sk_test_...`)

## Install Stripe CLI

The Stripe CLI will help us create and manage Stripe resources from the command line.

### Installation

```bash
# macOS (Homebrew)
brew install stripe/stripe-cli/stripe

# Windows (Scoop)
scoop install stripe

# Other platforms: https://stripe.com/docs/stripe-cli#install
```

### Authentication

```bash
# Log in to your Stripe account via CLI
stripe login

# Verify login worked
stripe config list
```

## Create Subscription Product

We'll create a "Premium" subscription product with a monthly fee and trial period.

```bash
# Create a price for $10/month with 14-day trial
stripe prices create  \
  --currency=usd \
  --unit-amount=1000 \
  -d "recurring[interval]"=month \
  -d "recurring[trial_period_days]"=14 \
  -d "product_data[name]"="TaskMaster Premium"

# List products to verify creation
stripe products list

# Save the price ID (price_xyz...) - you'll need this later
stripe prices list

# Or if you want to list for a specific product (and you have many):
stripe prices list --product="your-product-id"
```

The above creates both a product and an associated price in one command. The price ID will be used in our implementation to initiate subscriptions.

## Configure Customer Portal

The Customer Portal lets users manage their subscriptions. We'll configure it with basic settings:

```bash
# Create portal configuration
stripe billing_portal configurations create \
  -d "business_profile[privacy_policy_url]=https://your-site.com/privacy" \
  -d "business_profile[terms_of_service_url]=https://your-site.com/terms" \
  -d "default_return_url=http://localhost:3000/profile" \
  -d "features[customer_update][enabled]=true" \
  -d "features[customer_update][allowed_updates][]=email" \
  -d "features[customer_update][allowed_updates][]=address" \
  -d "features[subscription_cancel][enabled]=true" \
  -d "features[payment_method_update][enabled]=true" \
  -d "features[invoice_history][enabled]=true"
```

Note: Update the privacy/terms URLs to your actual URLs before going to production.

## Set Up Webhooks

Webhooks allow Stripe to notify our application about events like successful payments or cancelled subscriptions.

1. Go to **Developers > Webhooks** in the Stripe Dashboard
2. Click **Add Endpoint**
3. Enter an endpoint URL (we'll create this as an edge function later):
   ```
   https://[YOUR-PROJECT-ID].supabase.co/functions/v1/stripe-webhook
   ```
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `invoice.payment_failed`
5. Click **Add Endpoint**
6. Save the **Signing Secret** (`whsec_...`) - you'll need this for webhook verification

## Collect Required Values

You'll need these values for implementation in the next part. We'll come back to these, but you can just note them down somewhere for now:

1. **API Keys** (from Developers > API Keys):
   - Secret Key (`sk_test_...`)
2. **Price ID** (`price_...`) from the subscription product we created
3. **Webhook Signing Secret** (`whsec_...`)

You can actually update them into your `.env.test.local` file right now. But we'll also ned to set them as Supabase secrets later.

```sh
STRIPE_SECRET_KEY="sk_test_XXX"
STRIPE_PRICE_ID="price_XXX"
STRIPE_WEBHOOK_SECRET="whsec_XXX"
```
