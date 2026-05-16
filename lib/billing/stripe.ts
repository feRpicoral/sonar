import Stripe from "stripe";

let _client: Stripe | undefined;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set. See .env.example.`);
  return v;
}

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
