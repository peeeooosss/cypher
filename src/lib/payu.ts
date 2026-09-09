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

export function verifyPayUCallbackHash(data: PayUCallbackData, salt: string): boolean {
  return computePayUCallbackHashMatches(data, salt).matches;
}

export function debugPayUCallbackHash(data: PayUCallbackData, salt: string) {
  return computePayUCallbackHashMatches(data, salt).debug;
}

function computePayUCallbackHashMatches(data: PayUCallbackData, salt: string) {
  const amountCandidates = Array.from(
    new Set([data.amount, data.amt].filter(Boolean).map(normalizeAmount)),
  );
  const debug = amountCandidates.map((amount) => {
    const hashString = `${salt}|${data.status}||||||||||${data.email}|${data.firstname}|${data.productinfo}|${amount}|${data.txnid}|${data.key}`;
    const calculatedHash = generateHash(hashString);
    return { amount, hashString, calculatedHash, matches: calculatedHash === data.hash };
  });
  return { matches: debug.some((d) => d.matches), debug };
}

function normalizeAmount(amount: string): string {
  const parsed = parseFloat(amount);
  if (Number.isNaN(parsed)) return amount;
  const plain = String(parsed);
  return plain === amount ? amount : plain;
}

export function verifyPayUWebhookHash(data: Record<string, string>, salt: string): boolean {
  const amountCandidates = Array.from(
    new Set([data.amount, data.amt].filter(Boolean).map(normalizeAmount)),
  );
  return amountCandidates.some((amount) => {
    const hashString = `${salt}|${data.status}||||||||||${data.email}|${data.firstname}|${data.productinfo}|${amount}|${data.txnid}|${data.key || PAYU_MERCHANT_KEY}`;
    return generateHash(hashString) === data.hash;
  });
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