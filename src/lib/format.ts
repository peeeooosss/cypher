export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatFee(entryFee: number | null | undefined, entryCurrency: string | null | undefined) {
  if (!entryFee || entryFee <= 0) return "Free";
  const currency = entryCurrency ?? "INR";
  return currency === "INR" ? `₹${entryFee}` : `${currency} ${entryFee}`;
}