import "dotenv/config";
import { createServer } from "http";
import { getToken } from "next-auth/jwt";
import type { NextApiRequest } from "next";
import { prisma } from "../src/lib/prisma";
import { Server } from "socket.io";
import { z } from "zod";
import { completeMatch } from "../src/lib/bracket";

const connectionString = process.env.DATABASE_URL;
const secret = process.env.NEXTAUTH_SECRET;

if (!connectionString || !secret) {
  throw new Error("DATABASE_URL and NEXTAUTH_SECRET are required for the Socket.io server");
}

const port = Number(process.env.SOCKET_PORT ?? 3001);
const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: { origin: allowedOrigin, credentials: true },
});

const scoreSchema = z.object({
  eventId: z.string().cuid(),
  matchId: z.string().cuid(),
  scoreA: z.number().int().min(0).max(10),
  scoreB: z.number().int().min(0).max(10),
  feedback: z.string().optional(),
});

const internalEmitSchema = z.object({
  secret: z.string(),
  eventId: z.string().cuid(),
  event: z.string(),
  data: z.unknown().optional(),
});

type JudgeSocketData = { type: "judge"; slotId: string; eventId: string };
type OrganizerSocketData = { type: "organizer"; userId: string };
type SocketUser = JudgeSocketData | OrganizerSocketData;

function parseCookies(header: string | undefined) {
  return Object.fromEntries(
    (header ?? "").split(";").flatMap((part) => {
      const separator = part.indexOf("=");
      return separator === -1 ? [] : [[part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())]];
    }),
  );
}

async function getMatchState(eventId: string) {
  return prisma.battleMatch.findMany({
    where: { eventId },
    include: {
      competitorA: { include: { user: { select: { id: true, name: true } } } },
      competitorB: { include: { user: { select: { id: true, name: true } } } },
      winner: { include: { user: { select: { id: true, name: true } } } },
      scores: { include: { judgeSlot: { select: { name: true, code: true } } } },
    },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });
}

// Internal HTTP endpoint for API routes to emit socket events
httpServer.on("request", async (req, res) => {
  if (req.method !== "POST" || req.url !== "/internal/emit") {
    res.writeHead(404);
    res.end();
    return;
  }

  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    try {
      const parsed = internalEmitSchema.safeParse(JSON.parse(body));
      if (!parsed.success || parsed.data.secret !== secret) {
        res.writeHead(403);
        res.end("FORBIDDEN");
        return;
      }

      io.to(`event:${parsed.data.eventId}`).emit(parsed.data.event, parsed.data.data);
      res.writeHead(200);
      res.end("OK");
    } catch {
      res.writeHead(400);
      res.end("BAD_REQUEST");
    }
  });
});

io.use(async (socket, next) => {
  try {
    const code = socket.handshake.query.code as string | undefined;

    if (code) {
      const slot = await prisma.judgeSlot.findUnique({
        where: { code: code.toUpperCase() },
        select: { id: true, isActive: true, eventId: true },
      });

      if (!slot || !slot.isActive) {
        next(new Error("Invalid or expired code"));
        return;
      }

      socket.data.user = { type: "judge", slotId: slot.id, eventId: slot.eventId } as JudgeSocketData;
      next();
      return;
    }

    const token = await getToken({
      req: {
        headers: socket.request.headers,
        cookies: parseCookies(socket.request.headers.cookie),
      } as unknown as NextApiRequest,
      secret,
    });

    if (!token?.id) {
      next(new Error("UNAUTHORIZED"));
      return;
    }

    socket.data.user = { type: "organizer", userId: token.id } as OrganizerSocketData;
    next();
  } catch (error) {
    console.error(error);
    next(new Error("AUTHENTICATION_FAILED"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user as SocketUser;

  socket.on("event:join", async (payload: unknown, acknowledge?: (response: { error?: string }) => void) => {
    const parsed = z.object({ eventId: z.string().cuid() }).safeParse(payload);
    if (!parsed.success) { acknowledge?.({ error: "Invalid eventId" }); return; }

    const room = `event:${parsed.data.eventId}`;

    if (user.type === "judge") {
      if (user.eventId !== parsed.data.eventId) { acknowledge?.({ error: "Code is not valid for this event" }); return; }
    } else {
      const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId }, select: { organizerId: true } });
      if (!event || event.organizerId !== user.userId) { acknowledge?.({ error: "Only the organizer can join this event" }); return; }
    }

    await socket.join(room);
    socket.emit("event:state", await getMatchState(parsed.data.eventId));
    acknowledge?.({});
  });

  socket.on("match:score", async (payload: unknown, acknowledge?: (response: { error?: string }) => void) => {
    if (user.type !== "judge") { acknowledge?.({ error: "Only judges can submit scores" }); return; }

    const parsed = scoreSchema.safeParse(payload);
    if (!parsed.success) { acknowledge?.({ error: "Invalid score data" }); return; }
    if (!socket.rooms.has(`event:${parsed.data.eventId}`)) { acknowledge?.({ error: "Join the event before scoring" }); return; }

    const match = await prisma.battleMatch.findFirst({ where: { id: parsed.data.matchId, eventId: parsed.data.eventId } });
    if (!match) { acknowledge?.({ error: "Match not found" }); return; }

    const score = await prisma.matchScore.upsert({
      where: { matchId_judgeSlotId: { matchId: match.id, judgeSlotId: user.slotId } },
      update: { scoreA: parsed.data.scoreA, scoreB: parsed.data.scoreB, feedback: parsed.data.feedback ?? null },
      create: { matchId: match.id, judgeSlotId: user.slotId, scoreA: parsed.data.scoreA, scoreB: parsed.data.scoreB, feedback: parsed.data.feedback ?? null },
    });

    const totals = await prisma.matchScore.aggregate({ where: { matchId: match.id }, _sum: { scoreA: true, scoreB: true } });
    const updatedMatch = await prisma.battleMatch.update({
      where: { id: match.id },
      data: { status: "LIVE", scoreA: totals._sum.scoreA ?? 0, scoreB: totals._sum.scoreB ?? 0 },
    });

    io.to(`event:${parsed.data.eventId}`).emit("match:updated", { match: updatedMatch, score });
    acknowledge?.({});
  });

  socket.on("match:complete", async (payload: unknown, acknowledge?: (response: { error?: string }) => void) => {
    if (user.type !== "organizer") { acknowledge?.({ error: "Only organizers can complete matches" }); return; }

    const parsed = z.object({ eventId: z.string().cuid(), matchId: z.string().cuid(), winnerId: z.string().cuid() }).safeParse(payload);
    if (!parsed.success) { acknowledge?.({ error: "Invalid data" }); return; }
    if (!socket.rooms.has(`event:${parsed.data.eventId}`)) { acknowledge?.({ error: "Join the event before completing a match" }); return; }

    try {
      const match = await completeMatch(parsed.data.matchId, parsed.data.winnerId, user.userId);
      io.to(`event:${parsed.data.eventId}`).emit("match:updated", { match });
      acknowledge?.({});
    } catch (error) {
      acknowledge?.({ error: error instanceof Error ? error.message : "Unable to complete match" });
    }
  });
});

httpServer.listen(port, () => {
  console.log(`CYPHR Socket.io server listening on port ${port}`);
});

async function shutdown() {
  await prisma.$disconnect();
  io.close();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
