export const PAYMENT_UPI_ID = process.env.NEXT_PUBLIC_PAYMENT_UPI_ID ?? "9864854481@ptsbi";
export const PAYMENT_NAME = process.env.NEXT_PUBLIC_PAYMENT_NAME ?? "CYPHR";
export const BILL_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_BILL_WHATSAPP_NUMBER ?? "919864854481";

export function whatsappLink(number: string, text: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
