
## Webhook Debugging Checklist

### Issue Analysis
Your `isPaid` remains `false` because **the webhook is likely not being triggered at all**.

### Step 1: Verify Webhook is Being Hit
Run your server and make a test payment. Check your server logs for:
```
🔔 POST /api/stripe received
Stripe-Signature: Present
✅ Webhook signature verified
📨 Webhook Event Type: checkout.session.completed
```

### Step 2: Are You Testing Locally?
If testing on localhost:3000:
1. **STRIPE WEBHOOKS DO NOT WORK ON LOCALHOST WITHOUT STRIPE CLI**
2. You MUST use Stripe CLI to forward webhooks to your local server

#### Install & Setup Stripe CLI:
```bash
# Windows - Download from: https://github.com/stripe/stripe-cli/releases
# Or use: choco install stripe-cli

stripe login
# Follow the prompt to authenticate

stripe listen --forward-to localhost:3000/api/stripe
```

This will output a webhook secret that you should use in your .env:
```
STRIPE_WEBHOOK_SECRET = whsec_xxxxx_from_stripe_cli
```

### Step 3: Check Stripe Dashboard Configuration
1. Go to https://dashboard.stripe.com/webhooks
2. Verify your webhook endpoint is registered for:
   - `checkout.session.completed` ✅
   - `payment_intent.succeeded` (optional fallback)
3. Check recent webhook deliveries for success/failure

### Step 4: Check Your Current Environment
Your webhook secret is: `whsec_85h0NqLiUMZtt2fNIXTwUh3w5ZSoRrMA`

To verify it's the TEST webhook secret (for testing):
- Should start with `whsec_test_` (if you're in test mode)
- Your current one is just `whsec_...` which looks correct

### Step 5: Manual Test
Once Stripe CLI is running, use this test command:
```bash
stripe trigger checkout.session.completed
```

Your server logs should show the webhook being processed.

### Step 6: Database Connection Check
Verify MongoDB is connected and working:
- Transaction should be created BEFORE payment
- User should exist in database
- After webhook, `isPaid` should change to `true` AND credits should increment

### Expected Flow:
1. User clicks "Buy Premium" (1000 credits)
2. Backend creates Transaction with `isPaid: false`
3. Stripe checkout session created with metadata {transactionId, appId}
4. User completes payment on Stripe
5. **[THIS IS WHERE IT FAILS]** Stripe sends webhook to your endpoint
6. Webhook handler finds transaction and sets `isPaid: true`
7. Credits added to user: `17 + 1000 = 1017`

### Why It's Failing Now:
- ❌ Webhook not being delivered (most likely)
- ❌ Wrong webhook secret
- ❌ Not using Stripe CLI for local testing
- ❌ Wrong endpoint path
- ❌ Signature verification failing silently

### Next Actions:
1. Set up Stripe CLI (if testing locally)
2. Update webhook secret if using CLI
3. Run test transaction
4. Send server logs to diagnose

