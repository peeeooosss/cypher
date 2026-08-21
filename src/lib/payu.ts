import crypto from "crypto";

export const PAYU_MERCHANT_KEY = process.env.PAYU_MERCHANT_KEY ?? "";
export const PAYU_MERCHANT_SALT = process.env.PAYU_MERCHANT_SALT ?? "";
export const PAYU_BASE_URL =
  process.env.PAYU_BASE_URL ??
  (process.env.PAYU_ENV === "production" ? "https://secure.payu.in" : "https://test.payu.in");
export const PAYU_CHECKOUT_URL = `${PAYU_BASE_URL}/_payment`;

export function assertPayuConfig() {
  if (!PAYU_MERCHANT_KEY || !PAYU_MERCHANT_SALT) {
    throw new Error("PayU merchant credentials are not configured");
  }
}

export function amountForPayu(amountPaise: number): string {
  return (amountPaise / 100).toFixed(2);
}

function sha512(value: string): string {
  return crypto.createHash("sha512").update(value, "utf8").digest("hex");
}

export function createPayuRequestHash(fields: {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
}): string {
  assertPayuConfig();

  return sha512(
    [
      PAYU_MERCHANT_KEY,
      fields.txnid,
      fields.amount,
      fields.productinfo,
      fields.firstname,
      fields.email,
      fields.udf1 ?? "",
      fields.udf2 ?? "",
      fields.udf3 ?? "",
      fields.udf4 ?? "",
      fields.udf5 ?? "",
      "",
      "",
      "",
      "",
      "",
      PAYU_MERCHANT_SALT,
    ].join("|"),
  );
}

export function verifyPayuResponseHash(fields: Record<string, string>): boolean {
  if (!PAYU_MERCHANT_SALT || !PAYU_MERCHANT_KEY || !fields.hash) return false;

  const reverseHash = [
    PAYU_MERCHANT_SALT,
    fields.status ?? "",
    ...Array.from({ length: 10 }, (_, index) => fields[`udf${10 - index}`] ?? ""),
    fields.email ?? "",
    fields.firstname ?? "",
    fields.productinfo ?? "",
    fields.amount ?? "",
    fields.txnid ?? "",
    PAYU_MERCHANT_KEY,
  ].join("|");

  const expected = fields.additionalCharges
    ? sha512(`${fields.additionalCharges}|${reverseHash}`)
    : sha512(reverseHash);

  const actual = fields.hash.toLowerCase();
  if (actual.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function firstNameFrom(name: string | null): string {
  return (name?.trim().split(/\s+/)[0] || "CYPHR").slice(0, 60);
}

export function payuCallbackUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not configured");
  return `${appUrl.replace(/\/$/, "")}/api/payments/payu/callback`;
}

export function parsePayuForm(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body).entries());
}
