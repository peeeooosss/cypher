import "dotenv/config";
import { getToken } from "next-auth/jwt";
import type { NextApiRequest } from "next";
import { Server } from "socket.io";
import { z } from "zod";
import { completeMatch } from "../src/lib/bracket";
import { prisma } from "../src/lib/prisma";

const connectionString = process.env.DATABASE_URL;
const secret = process.env.NEXTAUTH_SECRET;

if (!connectionString || !secret) {
  throw new Error("DATABASE_URL and NEXTAUTH_SECRET are required for the Socket.io server");
}

const port = Number(process.env.SOCKET_PORT ?? 3001);
const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const io = new Server(port, {
  cors: { origin: allowedOrigin, credentials: true },
});

const joinSchema = z.object({ eventId: z.string().cuid() });
const scoreSchema = z.object({
  eventId: z.string().cuid(),
  matchId: z.string().cuid(),
  scoreA: z.number().int().min(0).max(10),
  scoreB: z.number().int().min(0).max(10),
});
const completeSchema = z.object({
  eventId: z.string().cuid(),
  matchId: z.string().cuid(),
  winnerId: z.string().cuid(),
});

function parseCookies(header: string | undefined) {
  return Object.fromEntries(
    (header ?? "").split(";").flatMap((part) => {
      const separator = part.indexOf("=");
      return separator === -1 ? [] : [[part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())]];
    }),
  );
}

async function getSocketUser(socket: Parameters<Parameters<typeof io.use>[0]>[0]) {
  const token = await getToken({
    req: {
      headers: socket.request.headers,
      cookies: parseCookies(socket.request.headers.cookie),
    } as unknown as NextApiRequest,
    secret,
  });

  if (!token?.id || !token.role) {
    return null;
  }

  return { id: token.id, role: token.role };
}

async function getMatchState(eventId: string) {
  return prisma.battleMatch.findMany({
    where: { eventId },
    include: {
      competitorA: { include: { user: { select: { id: true, name: true } } } },
      competitorB: { include: { user: { select: { id: true, name: true } } } },
      winner: { include: { user: { select: { id: true, name: true } } } },
      scores: true,
    },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });
}

io.use(async (socket, next) => {
  try {
    const user = await getSocketUser(socket);

    if (!user) {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    socket.data.user = user;
    next();
  } catch (error) {
    console.error(error);
    next(new Error("AUTHENTICATION_FAILED"));
  }
});

io.on("connection", (socket) => {
  socket.on("event:join", async (payload: unknown, acknowledge?: (response: { error?: string }) => void) => {
    const parsed = joinSchema.safeParse(payload);

    if (!parsed.success) {
      acknowledge?.({ error: "Invalid eventId" });
      return;
    }

    const event = await prisma.event.findUnique({
      where: { id: parsed.data.eventId },
      include: { judges: { select: { id: true } } },
    });

    const user = socket.data.user;
    const canView = event && (
      event.organizerId === user.id ||
      event.judges.some((judge) => judge.id === user.id) ||
      ["PUBLISHED", "LIVE"].includes(event.status)
    );

    if (!canView) {
      acknowledge?.({ error: "Event not found or unavailable" });
      return;
    }

    const room = `event:${event.id}`;
    await socket.join(room);
    socket.emit("event:state", await getMatchState(event.id));
    acknowledge?.({});
  });

  socket.on("match:score", async (payload: unknown, acknowledge?: (response: { error?: string }) => void) => {
    const parsed = scoreSchema.safeParse(payload);

    if (!parsed.success || !["JUDGE", "ORGANIZER"].includes(socket.data.user.role)) {
      acknowledge?.({ error: "Invalid score or insufficient permissions" });
      return;
    }

    if (!socket.rooms.has(`event:${parsed.data.eventId}`)) {
      acknowledge?.({ error: "Join the event before scoring" });
      return;
    }

    const match = await prisma.battleMatch.findFirst({
      where: {
        id: parsed.data.matchId,
        eventId: parsed.data.eventId,
        event: {
          OR: [
            { organizerId: socket.data.user.id },
            { judges: { some: { id: socket.data.user.id } } },
          ],
        },
      },
    });

    if (!match) {
      acknowledge?.({ error: "Match not found or judge is not assigned" });
      return;
    }

    const score = await prisma.matchScore.upsert({
      where: { matchId_judgeId: { matchId: match.id, judgeId: socket.data.user.id } },
      update: { scoreA: parsed.data.scoreA, scoreB: parsed.data.scoreB },
      create: { matchId: match.id, judgeId: socket.data.user.id, scoreA: parsed.data.scoreA, scoreB: parsed.data.scoreB },
    });
    const totals = await prisma.matchScore.aggregate({
      where: { matchId: match.id },
      _sum: { scoreA: true, scoreB: true },
    });
    const updatedMatch = await prisma.battleMatch.update({
      where: { id: match.id },
      data: { status: "LIVE", scoreA: totals._sum.scoreA ?? 0, scoreB: totals._sum.scoreB ?? 0 },
    });

    io.to(`event:${parsed.data.eventId}`).emit("match:updated", { match: updatedMatch, score });
    acknowledge?.({});
  });

  socket.on("match:complete", async (payload: unknown, acknowledge?: (response: { error?: string }) => void) => {
    const parsed = completeSchema.safeParse(payload);

    if (!parsed.success || socket.data.user.role !== "ORGANIZER") {
      acknowledge?.({ error: "Only organizers can complete matches" });
      return;
    }

    if (!socket.rooms.has(`event:${parsed.data.eventId}`)) {
      acknowledge?.({ error: "Join the event before completing a match" });
      return;
    }

    try {
      const match = await completeMatch(parsed.data.matchId, parsed.data.winnerId, socket.data.user.id);
      io.to(`event:${parsed.data.eventId}`).emit("match:updated", { match });
      acknowledge?.({});
    } catch (error) {
      acknowledge?.({ error: error instanceof Error ? error.message : "Unable to complete match" });
    }
  });
});

console.log(`CallOut Socket.io server listening on port ${port}`);

async function shutdown() {
  await prisma.$disconnect();
  io.close();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
