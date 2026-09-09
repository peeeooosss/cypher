import crypto from "crypto";

export const PAYU_MERCHANT_KEY = process.env.PAYU_MERCHANT_KEY ?? "";
export const PAYU_MERCHANT_SALT = process.env.PAYU_MERCHANT_SALT ?? "";
export const PAYU_BASE_URL = process.env.PAYU_BASE_URL ?? "https://secure.payu.in";
export const PAYU_SUCCESS_URL = process.env.PAYU_SUCCESS_URL ?? "";
export const PAYU_FAILURE_URL = process.env.PAYU_FAILURE_URL ?? "";
export const PAYU_WEBHOOK_URL = process.env.PAYU_WEBHOOK_URL ?? "";

export type PayUPaymentPurpose = 
  | "FLAT_FEE" 
  | "COMMISSION" 
  | "GIG_POST" 
  | "GIG_WORK" 
  | "GIG_CONNECTION"
  | "REGISTRATION";

export interface PayUOrderPayload {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  surl: string;
  furl: string;
  curl?: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  hash: string;
}

export interface PayUCallbackData {
  mihpayid: string;
  request_id: string;
  bank_ref_num: string;
  amt: string;
  amount: string;
  disc: string;
  mode: string;
  PG_TYPE: string;
  card_no: string;
  name_on_card: string;
  udf1: string;
  udf2: string;
  udf3: string;
  udf4: string;
  udf5: string;
  status: string;
  unmappedstatus: string;
  Merchant_Service_Charge: string;
  offer_type: string;
  offer_value: string;
  additional_charges: string;
  net_amount_debit: string;
  addedon: string;
  payment_source: string;
  rrn: string;
  bankcode: string;
  error: string;
  error_Message: string;
  txnid: string;
  key: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  hash: string;
}

export function payuAmountPaise(...amountFields: (string | undefined)[]): number[] {
  return Array.from(
    new Set(amountFields.filter((v): v is string => Boolean(v)).map((v) => Math.round(parseFloat(v) * 100))),
  );
}

function generateHash(params: string): string {
  return crypto.createHash("sha512").update(params).digest("hex");
}

export function buildPayUHash(
  key: string,
  txnid: string,
  amount: string,
  productinfo: string,
  firstname: string,
  email: string,
  udf1: string,
  udf2: string,
  udf3: string,
  udf4: string,
  udf5: string,
  salt: string
): string {
  const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}|${udf2}|${udf3}|${udf4}|${udf5}||||||${salt}`;
  return generateHash(hashString);
}

interface PayUHashFields {
  status?: string;
  unmappedstatus?: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  email?: string;
  firstname?: string;
  productinfo?: string;
  amount?: string;
  amt?: string;
  txnid?: string;
  key?: string;
  hash?: string;
}

function fromCallbackOrWebhook(source: Record<string, string>): PayUHashFields {
  return {
    status: source.status,
    unmappedstatus: source.unmappedstatus,
    udf1: source.udf1,
    udf2: source.udf2,
    udf3: source.udf3,
    udf4: source.udf4,
    udf5: source.udf5,
    email: source.email,
    firstname: source.firstname,
    productinfo: source.productinfo,
    amount: source.amount,
    amt: source.amt,
    txnid: source.txnid,
    key: source.key,
    hash: source.hash,
  };
}

function payUHashCandidates(fields: PayUHashFields, salt: string) {
  const rawAmounts = [fields.amount, fields.amt].filter((v): v is string => Boolean(v));
  const amounts = Array.from(new Set([...rawAmounts, ...rawAmounts.map(normalizeAmount)]));
  const key = fields.key || PAYU_MERCHANT_KEY;
  const email = fields.email ?? "";
  const firstname = fields.firstname ?? "";
  const productinfo = fields.productinfo ?? "";
  const txnid = fields.txnid ?? "";
  const status = fields.status ?? "";
  const out: { label: string; hashString: string }[] = [];

  for (const amount of amounts) {
    // PayU v2 verification hash (includes unmappedstatus + reversed udf1..5)
    out.push({
      label: `v2[${amount}]`,
      hashString: `${salt}|${status}|${fields.unmappedstatus ?? ""}||||||${fields.udf5 ?? ""}|${fields.udf4 ?? ""}|${fields.udf3 ?? ""}|${fields.udf2 ?? ""}|${fields.udf1 ?? ""}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`,
    });
    // v2 without unmappedstatus
    out.push({
      label: `v2-noUMS[${amount}]`,
      hashString: `${salt}|${status}||||||${fields.udf5 ?? ""}|${fields.udf4 ?? ""}|${fields.udf3 ?? ""}|${fields.udf2 ?? ""}|${fields.udf1 ?? ""}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`,
    });
    // legacy v1 variants (10 and 11 blank pipes between status and email)
    for (const pads of [10, 11]) {
      out.push({
        label: `v1(${pads})[${amount}]`,
        hashString: `${salt}|${status}${"|".repeat(pads)}${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`,
      });
    }
  }
  return out;
}

function buildPayUHashResult(fields: PayUHashFields, salt: string) {
  const expected = (fields.hash ?? "").toLowerCase();
  const candidates = payUHashCandidates(fields, salt);
  const debug = candidates.map((c) => {
    const calculatedHash = generateHash(c.hashString);
    return {
      label: c.label,
      hashString: c.hashString,
      calculatedHash,
      matches: calculatedHash === expected,
    };
  });
  return { matches: debug.some((d) => d.matches), debug };
}

export function verifyPayUCallbackHash(data: PayUCallbackData, salt: string): boolean {
  return buildPayUHashResult(fromCallbackOrWebhook(data as unknown as Record<string, string>), salt).matches;
}

export function debugPayUCallbackHash(data: PayUCallbackData, salt: string) {
  return buildPayUHashResult(fromCallbackOrWebhook(data as unknown as Record<string, string>), salt).debug;
}

function normalizeAmount(amount: string): string {
  const parsed = parseFloat(amount);
  if (Number.isNaN(parsed)) return amount;
  const plain = String(parsed);
  return plain === amount ? amount : plain;
}

export function verifyPayUWebhookHash(data: Record<string, string>, salt: string): boolean {
  return buildPayUHashResult(fromCallbackOrWebhook(data), salt).matches;
}

export function createPayUOrder(params: {
  txnid: string;
  amount: number;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  udf1?: string;
  udf2?: string;
  udf3?: string;
  udf4?: string;
  udf5?: string;
  surl?: string;
  furl?: string;
  curl?: string;
}): PayUOrderPayload {
  const amountStr = params.amount.toFixed(2);
  const udf1 = params.udf1 || "";
  const udf2 = params.udf2 || "";
  const udf3 = params.udf3 || "";
  const udf4 = params.udf4 || "";
  const udf5 = params.udf5 || "";
  const surl = params.surl || PAYU_SUCCESS_URL;
  const furl = params.furl || PAYU_FAILURE_URL;

  const hash = buildPayUHash(
    PAYU_MERCHANT_KEY,
    params.txnid,
    amountStr,
    params.productinfo,
    params.firstname,
    params.email,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    PAYU_MERCHANT_SALT
  );

  return {
    key: PAYU_MERCHANT_KEY,
    txnid: params.txnid,
    amount: amountStr,
    productinfo: params.productinfo,
    firstname: params.firstname,
    email: params.email,
    phone: params.phone,
    surl,
    furl,
    curl: params.curl,
    udf1,
    udf2,
    udf3,
    udf4,
    udf5,
    hash,
  };
}

export function generateTxnId(prefix: string = "CYPHR"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`.toUpperCase();
}

export function formatAmountForPayU(amount: number): string {
  return amount.toFixed(2);
}

export function parsePayUAmount(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}

export function resolveCallbackUrl(request: Request, path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (base) return new URL(path, /^https?:\/\//.test(base) ? base : `https://${base}`).toString();
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return new URL(path, `${proto}://${host}`).toString();
}