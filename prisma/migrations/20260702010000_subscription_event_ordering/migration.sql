-- Track the created timestamp of the most recent Stripe event applied to each
-- subscription so the webhook handler can drop out-of-order deliveries (e.g. a
-- stale customer.subscription.updated arriving after a .deleted).
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_stripe_event_at timestamptz;
