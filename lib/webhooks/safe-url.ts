import { lookup } from "dns/promises";
import { isIPv4, isIPv6 } from "net";

export class UnsafeWebhookUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeWebhookUrlError";
  }
}

/**
 * Validate a user-supplied webhook URL before we fetch it. Rejects non-http(s)
 * protocols and any host that resolves into the internal network (loopback,
 * link-local, RFC1918, CGNAT, IPv6 ULA, multicast, ...). Called on every
 * subscription create and again right before each delivery so a DNS record
 * that rotates to an internal IP later still gets blocked.
 */
export async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeWebhookUrlError("Invalid URL");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UnsafeWebhookUrlError("Only http and https URLs are allowed");
  }

  // URL.hostname keeps the brackets on IPv6 literals; strip them so the IP
  // checks below match plain addresses.
  const rawHostname = url.hostname;
  if (!rawHostname) throw new UnsafeWebhookUrlError("URL must include a hostname");
  const hostname =
    rawHostname.startsWith("[") && rawHostname.endsWith("]")
      ? rawHostname.slice(1, -1)
      : rawHostname;

  // Literal IP in the hostname - check directly, no DNS needed.
  if (isIPv4(hostname) || isIPv6(hostname)) {
    assertSafeAddress(hostname);
    return;
  }

  // Reject "localhost" outright before paying for DNS - some resolvers will
  // happily hand back a public IP from /etc/hosts overrides.
  if (hostname.toLowerCase() === "localhost") {
    throw new UnsafeWebhookUrlError("localhost is not allowed");
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new UnsafeWebhookUrlError(`Could not resolve ${hostname}`);
  }
  if (addresses.length === 0) {
    throw new UnsafeWebhookUrlError(`Could not resolve ${hostname}`);
  }
  // Reject the whole host if any record is unsafe - blocks the DNS-rebind
  // trick of returning both a public IP and 127.0.0.1.
  for (const a of addresses) {
    assertSafeAddress(a.address);
  }
}

function assertSafeAddress(addr: string): void {
  if (isIPv4(addr)) {
    if (isUnsafeIPv4(addr)) {
      throw new UnsafeWebhookUrlError(`Address ${addr} is in a blocked range`);
    }
    return;
  }
  if (isIPv6(addr)) {
    if (isUnsafeIPv6(addr)) {
      throw new UnsafeWebhookUrlError(`Address ${addr} is in a blocked range`);
    }
    return;
  }
  throw new UnsafeWebhookUrlError(`Unrecognized address format: ${addr}`);
}

function isUnsafeIPv4(addr: string): boolean {
  const parts = addr.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a === 10) return true; // 10.0.0.0/8 RFC1918
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 RFC1918
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 RFC1918
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false;
}

function isUnsafeIPv6(addr: string): boolean {
  const lower = addr.toLowerCase();
  if (lower === "::" || lower === "::1") return true; // unspecified / loopback
  if (lower.startsWith("fe80:")) return true; // link-local
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true; // ULA fc00::/7
  if (lower.startsWith("ff")) return true; // multicast

  // IPv4-mapped: ::ffff:a.b.c.d (dotted) or ::ffff:abcd:efgh (compact hex).
  // Apply the v4 ranges to the embedded address.
  const mapped = decodeIPv4Mapped(lower);
  if (mapped !== null && isUnsafeIPv4(mapped)) return true;
  return false;
}

function decodeIPv4Mapped(addr: string): string | null {
  const dotted = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(addr);
  if (dotted) return dotted[1] ?? null;
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(addr);
  if (hex) {
    const hi = parseInt(hex[1] ?? "0", 16);
    const lo = parseInt(hex[2] ?? "0", 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}
