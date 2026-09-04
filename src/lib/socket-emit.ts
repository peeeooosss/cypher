import type {
  BracketGeneratedData,
  LeaderboardUpdateData,
  PhaseActivatedData,
  PhaseCompletedData,
  RegistrationWithdrawnData,
  SectionScoresInput,
  ServerToClientEvents,
} from "./socket/types";

const SOCKET_INTERNAL_URL = process.env.SOCKET_INTERNAL_URL ?? "http://localhost:3001";
const SOCKET_SECRET = process.env.NEXTAUTH_SECRET;

type LegacyEvents = {
  "phase:completed": PhaseCompletedData;
  "phase:activated": PhaseActivatedData;
  "bracket:generated": BracketGeneratedData;
  "registration:withdrawn": RegistrationWithdrawnData;
  "leaderboard:update": LeaderboardUpdateData;
  "dancer:updated": {
    dancerScore: unknown;
    judgeSlotId: string;
    registrationId: string;
    roundFormatId: string;
    score: number;
    sections?: SectionScoresInput;
  };
};

type EmitEvent = keyof ServerToClientEvents | keyof LegacyEvents;

type EmitPayload<K extends EmitEvent> = K extends keyof ServerToClientEvents
  ? Parameters<ServerToClientEvents[K]>[0]
  : K extends keyof LegacyEvents
    ? LegacyEvents[K]
    : never;

export async function emitToSocket<K extends EmitEvent>(
  eventId: string,
  event: K,
  data: EmitPayload<K>
): Promise<boolean> {
  if (!SOCKET_SECRET) {
    console.warn("[emitToSocket] NEXTAUTH_SECRET not set, skipping emit");
    return false;
  }

  try {
    const res = await fetch(`${SOCKET_INTERNAL_URL}/internal/emit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: SOCKET_SECRET, eventId, event, data }),
    });

    if (!res.ok) {
      console.error(`[emitToSocket] Failed to emit ${event}:`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[emitToSocket] Error emitting ${event}:`, err);
    return false;
  }
}

export async function emitToRoom<K extends EmitEvent>(
  room: string,
  event: K,
  data: EmitPayload<K>
): Promise<boolean> {
  return emitToSocket(room, event, data);
}
