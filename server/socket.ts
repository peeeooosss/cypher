import "dotenv/config";
import { createServer } from "http";
import { getToken } from "next-auth/jwt";
import type { NextApiRequest } from "next";
import { Redis } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import { prisma } from "../src/lib/prisma";
import { Server } from "socket.io";
import { z } from "zod";
import { completeMatch } from "../src/lib/bracket";
import {
  getDefaultTimeLimit,
  getLiveMatchPayload,
  getMatchAggregate,
  getMatchDecisionAggregate,
  getMatchScoreAggregate,
  getMatchState,
} from "../src/lib/live-match";
import { sectionTotal } from "../src/lib/scoring-sections";
import { SectionScoresSchema } from "../src/lib/socket/types";
import {
  JoinRoomSchema,
  SubmitScoreSchema,
  PushMatchLiveSchema,
  AdvanceWinnerSchema,
  LockVotingSchema,
  type ScoreSubmittedData,
  type MatchCompleteData,
  type ScoreLockedData,
  type SectionScoresInput,
} from "../src/lib/socket/types";

const connectionString = process.env.DATABASE_URL;
const secret = process.env.NEXTAUTH_SECRET;
const redisUrl = process.env.REDIS_URL;

if (!connectionString || !secret) {
  throw new Error("DATABASE_URL and NEXTAUTH_SECRET are required for the Socket.io server");
}

const port = Number(process.env.SOCKET_PORT ?? process.env.PORT ?? 3001);
const allowedOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: { origin: allowedOrigin, credentials: true },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

// Redis pub/sub adapter for horizontal scaling
let pubClient: Redis | null = null;
let subClient: Redis | null = null;
if (redisUrl) {
  pubClient = new Redis(redisUrl, { lazyConnect: true });
  subClient = pubClient.duplicate();
  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient!, subClient!));
      console.log("Socket.io connected to Redis adapter");
    })
    .catch((err) => console.error("Redis adapter failed to connect:", err));
} else {
  console.warn("REDIS_URL not set — running in single-process mode (no horizontal scaling)");
}

const scoreSchema = z.object({
  eventId: z.string().cuid(),
  matchId: z.string().cuid(),
  scoreA: z.number().min(0).max(20),
  scoreB: z.number().min(0).max(20),
  feedback: z.string().optional(),
});

const internalEmitSchema = z.object({
  secret: z.string(),
  eventId: z.string().cuid(),
  event: z.string(),
  data: z.unknown().optional(),
});

const dancerScoreSchema = z.object({
  eventId: z.string().cuid(),
  registrationId: z.string().cuid(),
  roundFormatId: z.string().cuid(),
  score: z.number().min(0).max(20).optional(),
  sections: SectionScoresSchema.optional(),
  feedback: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.sections == null && val.score == null) {
    ctx.addIssue({ code: "custom", message: "Provide sections or a score" });
  }
});

type JudgeSocketData = { type: "judge"; slotId: string; eventId: string };
type OrganizerSocketData = { type: "organizer"; userId: string };
type SpectatorSocketData = { type: "spectator" };
type SocketUser = JudgeSocketData | OrganizerSocketData | SpectatorSocketData;

function parseCookies(header: string | undefined) {
  return Object.fromEntries(
    (header ?? "").split(";").flatMap((part) => {
      const separator = part.indexOf("=");
      return separator === -1 ? [] : [[part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1).trim())]];
    }),
  );
}

// ---- Battle Timer Manager ----

// ---- Internal HTTP endpoint for API routes to emit socket events.
// Only intercept the internal emit path; all other requests must fall
// through to engine.io/Socket.IO handlers on the same server.
httpServer.on("request", (req, res) => {
  if (req.method !== "POST" || req.url !== "/internal/emit") {
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
      socket.data.user = { type: "spectator" } as SpectatorSocketData;
      next();
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

  // ---- New battle-flow events ----

  socket.on("join_event_room", async (payload: unknown, acknowledge?: (response: { ok: boolean; error?: string }) => void) => {
    const parsed = JoinRoomSchema.safeParse(payload);
    if (!parsed.success) { acknowledge?.({ ok: false, error: "Invalid join payload" }); return; }
    const { eventId } = parsed.data;

    if (user.type === "judge") {
      if (user.eventId !== eventId) { acknowledge?.({ ok: false, error: "Code is not valid for this event" }); return; }
    } else if (user.type === "organizer") {
      const event = await prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true } });
      if (!event || event.organizerId !== user.userId) { acknowledge?.({ ok: false, error: "Only the organizer can join this event" }); return; }
    }

    await socket.join(`event:${eventId}`);
    socket.emit("event_state", await getMatchState(eventId));
    acknowledge?.({ ok: true });
  });

  socket.on("push_match_live", async (payload: unknown, acknowledge?: (response: { ok: boolean; error?: string }) => void) => {
    if (user.type !== "organizer") { acknowledge?.({ ok: false, error: "Only organizers can push matches live" }); return; }

    const parsed = PushMatchLiveSchema.safeParse(payload);
    if (!parsed.success) { acknowledge?.({ ok: false, error: "Invalid match payload" }); return; }

    const match = await prisma.battleMatch.findUnique({
      where: { id: parsed.data.matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });
    if (!match) { acknowledge?.({ ok: false, error: "Match not found" }); return; }
    if (match.category.event.organizerId !== user.userId) { acknowledge?.({ ok: false, error: "Not your event" }); return; }

    const timeLimitMs = parsed.data.timeLimitMs ?? (await getDefaultTimeLimit(match.roundFormatId));

    await prisma.$transaction([
      prisma.battleMatch.update({ where: { id: match.id }, data: { status: "LIVE", startedAt: new Date() } }),
      prisma.battleTimer.upsert({
        where: { matchId: match.id },
        update: { timeLimitMs, startedAt: new Date(), lockedAt: null },
        create: { matchId: match.id, timeLimitMs, startedAt: new Date() },
      }),
    ]);

    const livePayload = await getLiveMatchPayload(match.id);
    if (livePayload) {
      io.to(`event:${match.eventId}`).emit("match_live", livePayload);
    }

    acknowledge?.({ ok: true });
  });

  socket.on("submit_score", async (payload: unknown, acknowledge?: (response: { ok: boolean; error?: string; aggregate?: { scoreRed: number; scoreBlue: number; judgeCount: number; redSections?: { musicality: number; foundation: number; presentation: number; execution: number }; blueSections?: { musicality: number; foundation: number; presentation: number; execution: number } } }) => void) => {
    if (user.type !== "judge") { acknowledge?.({ ok: false, error: "Only judges can submit scores" }); return; }

    const parsed = SubmitScoreSchema.safeParse(payload);
    if (!parsed.success) { acknowledge?.({ ok: false, error: "Invalid score data" }); return; }
    if (!socket.rooms.has(`event:${user.eventId}`)) { acknowledge?.({ ok: false, error: "Join the event before scoring" }); return; }

    const match = await prisma.battleMatch.findUnique({ where: { id: parsed.data.matchId } });
    if (!match) { acknowledge?.({ ok: false, error: "Match not found" }); return; }
    if (match.status === "LOCKED") { acknowledge?.({ ok: false, error: "Voting is locked for this match" }); return; }
    if (match.status === "COMPLETE") { acknowledge?.({ ok: false, error: "Match already complete" }); return; }

    // Verify judge is assigned to this match's panel (if assignments exist)
    const assignment = await prisma.judgeAssignment.findUnique({
      where: { matchId_judgeSlotId: { matchId: match.id, judgeSlotId: user.slotId } },
    });
    if (!assignment) {
      const panelCount = await prisma.judgeAssignment.count({ where: { matchId: match.id } });
      if (panelCount > 0) {
        acknowledge?.({ ok: false, error: "You are not assigned to this match's judging panel" });
        return;
      }
    }

    const isDecision = parsed.data.winnerCorner != null;
    const winnerCorner = parsed.data.winnerCorner?.toUpperCase() === "RED" ? "RED" : "BLUE";
    const hasSections = parsed.data.scoreRedSections != null && parsed.data.scoreBlueSections != null;

    async function resolveTemplate(templateId: string | undefined, fallback: string | undefined) {
      if (fallback) return fallback;
      if (!templateId) return null;
      const template = await prisma.feedbackTemplate.findUnique({
        where: { id: templateId },
        select: { text: true },
      });
      return template?.text ?? null;
    }

    let feedbackRed = await resolveTemplate(parsed.data.feedbackTemplateIdRed, parsed.data.feedbackRed);
    let feedbackBlue = await resolveTemplate(parsed.data.feedbackTemplateIdBlue, parsed.data.feedbackBlue);

    // Backward compatibility: legacy single-feedback (for the defeated entry).
    if (!feedbackRed && !feedbackBlue && (parsed.data.feedback || parsed.data.feedbackTemplateId)) {
      const legacy = await resolveTemplate(parsed.data.feedbackTemplateId, parsed.data.feedback);
      if (legacy) {
        if (winnerCorner === "RED") feedbackBlue = legacy;
        else feedbackRed = legacy;
      }
    }

    let scoreA = 0;
    let scoreB = 0;
    let aggregate: {
      scoreRed: number;
      scoreBlue: number;
      judgeCount: number;
      redSections?: SectionScoresInput;
      blueSections?: SectionScoresInput;
    };

    if (hasSections) {
      const r = parsed.data.scoreRedSections!;
      const b = parsed.data.scoreBlueSections!;
      scoreA = sectionTotal({
        MUSICALITY: r.musicality,
        FOUNDATION: r.foundation,
        PRESENTATION: r.presentation,
        EXECUTION: r.execution,
      });
      scoreB = sectionTotal({
        MUSICALITY: b.musicality,
        FOUNDATION: b.foundation,
        PRESENTATION: b.presentation,
        EXECUTION: b.execution,
      });

      await prisma.matchScore.upsert({
        where: { matchId_judgeSlotId: { matchId: match.id, judgeSlotId: user.slotId } },
        update: {
          scoreA,
          scoreB,
          scoreAMusicality: r.musicality,
          scoreAFoundation: r.foundation,
          scoreAPresentation: r.presentation,
          scoreAExecution: r.execution,
          scoreBMusicality: b.musicality,
          scoreBFoundation: b.foundation,
          scoreBPresentation: b.presentation,
          scoreBExecution: b.execution,
          winnerCorner: null,
          feedbackRed,
          feedbackBlue,
        },
        create: {
          matchId: match.id,
          judgeSlotId: user.slotId,
          scoreA,
          scoreB,
          scoreAMusicality: r.musicality,
          scoreAFoundation: r.foundation,
          scoreAPresentation: r.presentation,
          scoreAExecution: r.execution,
          scoreBMusicality: b.musicality,
          scoreBFoundation: b.foundation,
          scoreBPresentation: b.presentation,
          scoreBExecution: b.execution,
          feedbackRed,
          feedbackBlue,
        },
      });

      aggregate = await getMatchScoreAggregate(match.id);
    } else {
      if (!isDecision) {
        scoreA = parsed.data.scoreRed ?? 0;
        scoreB = parsed.data.scoreBlue ?? 0;
      }

      await prisma.matchScore.upsert({
        where: { matchId_judgeSlotId: { matchId: match.id, judgeSlotId: user.slotId } },
        update: isDecision
          ? { winnerCorner, scoreA: 0, scoreB: 0, feedbackRed, feedbackBlue }
          : { winnerCorner: null, scoreA, scoreB, feedbackRed, feedbackBlue },
        create: isDecision
          ? { matchId: match.id, judgeSlotId: user.slotId, winnerCorner, scoreA: 0, scoreB: 0, feedbackRed, feedbackBlue }
          : { matchId: match.id, judgeSlotId: user.slotId, scoreA, scoreB, feedbackRed, feedbackBlue },
      });

      aggregate = isDecision
        ? await getMatchDecisionAggregate(match.id)
        : await getMatchAggregate(match.id);
    }

    await prisma.battleMatch.update({
      where: { id: match.id },
      data: { status: "LIVE", scoreA: aggregate.scoreRed, scoreB: aggregate.scoreBlue },
    });

    const payloadData: ScoreSubmittedData = {
      matchId: match.id,
      judgeSlotId: user.slotId,
      scoreRed: isDecision ? (parsed.data.winnerCorner === "red" ? 1 : 0) : scoreA,
      scoreBlue: isDecision ? (parsed.data.winnerCorner === "blue" ? 1 : 0) : scoreB,
      aggregateRed: aggregate.scoreRed,
      aggregateBlue: aggregate.scoreBlue,
      judgeCount: aggregate.judgeCount,
      ...(hasSections && aggregate.redSections ? { redSections: aggregate.redSections } : {}),
      ...(hasSections && aggregate.blueSections ? { blueSections: aggregate.blueSections } : {}),
    };
    io.to(`event:${user.eventId}`).emit("score_submitted", payloadData);

    acknowledge?.({ ok: true, aggregate });
  });

  socket.on("advance_winner", async (payload: unknown, acknowledge?: (response: { ok: boolean; error?: string; bracket?: unknown[] }) => void) => {
    if (user.type !== "organizer") { acknowledge?.({ ok: false, error: "Only organizers can advance winners" }); return; }

    const parsed = AdvanceWinnerSchema.safeParse(payload);
    if (!parsed.success) { acknowledge?.({ ok: false, error: "Invalid advance payload" }); return; }

    const match = await prisma.battleMatch.findUnique({
      where: { id: parsed.data.matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });
    if (!match) { acknowledge?.({ ok: false, error: "Match not found" }); return; }
    if (match.category.event.organizerId !== user.userId) { acknowledge?.({ ok: false, error: "Not your event" }); return; }

    const winnerRegistrationId = parsed.data.winnerCorner === "red" ? match.competitorAId : match.competitorBId;
    if (!winnerRegistrationId) { acknowledge?.({ ok: false, error: "Winner competitor is not set" }); return; }

    await prisma.battleMatch.update({
      where: { id: match.id },
      data: { status: "COMPLETE", winnerId: winnerRegistrationId, completedAt: new Date() },
    });

    let nextMatchId: string | null = null;
    try {
      const completed = await completeMatch(match.id, winnerRegistrationId, user.userId);
      nextMatchId = completed.nextMatchId;
    } catch {
      // bracket progression may fail for finals — ignore
    }

    const bracket = await getMatchState(match.eventId);
    const payloadData: MatchCompleteData = {
      matchId: match.id,
      winnerCorner: parsed.data.winnerCorner,
      nextMatchId,
      bracketUpdated: bracket,
    };
    io.to(`event:${match.eventId}`).emit("match_complete", payloadData);

    acknowledge?.({ ok: true, bracket });
  });

  socket.on("lock_voting", async (payload: unknown, acknowledge?: (response: { ok: boolean; error?: string }) => void) => {
    if (user.type !== "organizer") { acknowledge?.({ ok: false, error: "Only organizers can lock voting" }); return; }

    const parsed = LockVotingSchema.safeParse(payload);
    if (!parsed.success) { acknowledge?.({ ok: false, error: "Invalid lock payload" }); return; }

    const match = await prisma.battleMatch.findUnique({
      where: { id: parsed.data.matchId },
      include: { category: { include: { event: { select: { organizerId: true } } } } },
    });
    if (!match) { acknowledge?.({ ok: false, error: "Match not found" }); return; }
    if (match.category.event.organizerId !== user.userId) { acknowledge?.({ ok: false, error: "Not your event" }); return; }

    if (parsed.data.locked) {
      await prisma.$transaction([
        prisma.battleMatch.update({ where: { id: match.id }, data: { status: "LOCKED" } }),
        prisma.battleTimer.update({ where: { matchId: match.id }, data: { lockedAt: new Date() } }),
      ]);
    } else {
      await prisma.battleMatch.update({ where: { id: match.id }, data: { status: "LIVE" } });
    }

    const payloadData: ScoreLockedData = { matchId: match.id, locked: parsed.data.locked };
    io.to(`event:${match.eventId}`).emit("score_locked", payloadData);
    acknowledge?.({ ok: true });
  });

  // ---- Legacy events (kept for compatibility with existing clients) ----

  socket.on("event:join", async (payload: unknown, acknowledge?: (response: { error?: string }) => void) => {
    const parsed = z.object({ eventId: z.string().cuid() }).safeParse(payload);
    if (!parsed.success) { acknowledge?.({ error: "Invalid eventId" }); return; }

    const room = `event:${parsed.data.eventId}`;

    if (user.type === "judge") {
      if (user.eventId !== parsed.data.eventId) { acknowledge?.({ error: "Code is not valid for this event" }); return; }
    } else if (user.type === "organizer") {
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

  socket.on("dancer:score", async (payload: unknown, acknowledge?: (response: { error?: string }) => void) => {
    if (user.type !== "judge") { acknowledge?.({ error: "Only judges can submit scores" }); return; }

    const parsed = dancerScoreSchema.safeParse(payload);
    if (!parsed.success) { acknowledge?.({ error: "Invalid score data" }); return; }
    if (!socket.rooms.has(`event:${parsed.data.eventId}`)) { acknowledge?.({ error: "Join the event before scoring" }); return; }

    const hasSections = parsed.data.sections != null;
    const total = hasSections
      ? sectionTotal({
          MUSICALITY: parsed.data.sections!.musicality,
          FOUNDATION: parsed.data.sections!.foundation,
          PRESENTATION: parsed.data.sections!.presentation,
          EXECUTION: parsed.data.sections!.execution,
        })
      : (parsed.data.score ?? 0);

    const dancerScore = await prisma.dancerScore.upsert({
      where: {
        judgeSlotId_registrationId_roundFormatId: {
          judgeSlotId: user.slotId,
          registrationId: parsed.data.registrationId,
          roundFormatId: parsed.data.roundFormatId,
        },
      },
      update: {
        score: total,
        musicality: hasSections ? parsed.data.sections!.musicality : undefined,
        foundation: hasSections ? parsed.data.sections!.foundation : undefined,
        presentation: hasSections ? parsed.data.sections!.presentation : undefined,
        execution: hasSections ? parsed.data.sections!.execution : undefined,
        feedback: parsed.data.feedback ?? null,
      },
      create: {
        judgeSlotId: user.slotId,
        registrationId: parsed.data.registrationId,
        roundFormatId: parsed.data.roundFormatId,
        score: total,
        musicality: hasSections ? parsed.data.sections!.musicality : null,
        foundation: hasSections ? parsed.data.sections!.foundation : null,
        presentation: hasSections ? parsed.data.sections!.presentation : null,
        execution: hasSections ? parsed.data.sections!.execution : null,
        feedback: parsed.data.feedback ?? null,
      },
    });

    io.to(`event:${parsed.data.eventId}`).emit("dancer:updated", {
      dancerScore,
      judgeSlotId: user.slotId,
      registrationId: parsed.data.registrationId,
      roundFormatId: parsed.data.roundFormatId,
      score: total,
      sections: parsed.data.sections ?? undefined,
      feedback: parsed.data.feedback ?? null,
    });
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
  if (pubClient) { await pubClient.quit(); }
  io.close();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
