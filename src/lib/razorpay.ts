import crypto from "crypto";
import Razorpay from "razorpay";

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const globalForRazorpay = globalThis as unknown as {
  razorpay: Razorpay | undefined;
};

function createRazorpayClient() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials are not configured");
  }

  return new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
}

export const razorpay = globalForRazorpay.razorpay ?? createRazorpayClient();

if (process.env.NODE_ENV !== "production") {
  globalForRazorpay.razorpay = razorpay;
}

export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const secret = RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(signature, "utf8"),
  );
}
