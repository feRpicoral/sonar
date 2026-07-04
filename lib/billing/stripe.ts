import Stripe from "stripe";

import { requireEnv } from "@/lib/env/server";

let _client: Stripe | undefined;

export function getStripe(): Stripe {
  if (_client) return _client;
  _client = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    typescript: true,
    appInfo: { name: "Sonar", version: "0.1.0" },
  });
  return _client;
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function proPriceId(): string {
  return requireEnv("STRIPE_PRICE_PRO");
}
