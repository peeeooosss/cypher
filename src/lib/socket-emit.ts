const SOCKET_INTERNAL_URL =
  process.env.SOCKET_INTERNAL_URL ?? "http://localhost:3001";
const SOCKET_SECRET = process.env.NEXTAUTH_SECRET;

export async function emitToSocket(eventId: string, event: string, data?: unknown) {
  if (!SOCKET_SECRET) return;

  try {
    await fetch(`${SOCKET_INTERNAL_URL}/internal/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SOCKET_SECRET, eventId, event, data }),
    });
  } catch {
    // socket server unreachable — silent; clients can poll
  }
}
