import { z } from "zod";

export const JoinRoomSchema = z.object({
  eventId: z.string().cuid(),
  role: z.enum(["judge", "organizer", "viewer"]),
  code: z.string().optional(),
});

export const PushMatchLiveSchema = z.object({
  matchId: z.string().cuid(),
  timeLimitMs: z.number().int().positive().optional(),
});

export const SubmitScoreSchema = z.object({
  matchId: z.string().cuid(),
  scoreRed: z.number().int().min(0).max(10).optional(),
  scoreBlue: z.number().int().min(0).max(10).optional(),
  winnerCorner: z.enum(["red", "blue"]).optional(),
  feedback: z.string().max(500).optional(),
  feedbackTemplateId: z.string().cuid().optional(),
}).superRefine((val, ctx) => {
  const hasScores = val.scoreRed != null && val.scoreBlue != null;
  const hasDecision = val.winnerCorner != null;
  if (!hasScores && !hasDecision) {
    ctx.addIssue({ code: "custom", message: "Provide scores or a winner decision" });
  }
});

export const AdvanceWinnerSchema = z.object({
  matchId: z.string().cuid(),
  winnerCorner: z.enum(["red", "blue"]),
});

export const LockVotingSchema = z.object({
  matchId: z.string().cuid(),
  locked: z.boolean(),
});

export const MatchLivePayload = z.object({
  matchId: z.string().cuid(),
  round: z.number(),
  position: z.number(),
  red: z.object({
    id: z.string(),
    name: z.string(),
    crew: z.string().nullable(),
    seed: z.number().nullable(),
    avatar: z.string().nullable(),
  }),
  blue: z.object({
    id: z.string(),
    name: z.string(),
    crew: z.string().nullable(),
    seed: z.number().nullable(),
    avatar: z.string().nullable(),
  }),
  timeLimitMs: z.number(),
  status: z.literal("LIVE"),
});

export const ScoreSubmittedPayload = z.object({
  matchId: z.string().cuid(),
  judgeSlotId: z.string(),
  scoreRed: z.number(),
  scoreBlue: z.number(),
  aggregateRed: z.number(),
  aggregateBlue: z.number(),
  judgeCount: z.number(),
});

export const MatchCompletePayload = z.object({
  matchId: z.string().cuid(),
  winnerCorner: z.enum(["red", "blue"]),
  nextMatchId: z.string().cuid().nullable(),
  bracketUpdated: z.array(z.unknown()).optional(),
});

export const ScoreLockedPayload = z.object({
  matchId: z.string().cuid(),
  locked: z.boolean(),
});

export const RegistrationWithdrawnPayload = z.object({
  registrationIds: z.array(z.string().cuid()),
  categoryId: z.string().cuid(),
});

export const PhaseActivatedPayload = z.object({
  phaseId: z.string().cuid(),
  phaseOrder: z.number(),
  type: z.string(),
  label: z.string().nullable(),
  categoryId: z.string().cuid(),
});

export const PhaseCompletedPayload = z.object({
  phaseId: z.string().cuid(),
  phaseOrder: z.number(),
  categoryId: z.string().cuid(),
});

export const BracketGeneratedPayload = z.object({
  matches: z.array(z.unknown()),
  categoryId: z.string().cuid(),
});

export const LeaderboardUpdatePayload = z.object({
  categoryId: z.string().cuid().optional(),
});

export type JoinRoomInput = z.infer<typeof JoinRoomSchema>;
export type PushMatchLiveInput = z.infer<typeof PushMatchLiveSchema>;
export type SubmitScoreInput = z.infer<typeof SubmitScoreSchema>;
export type AdvanceWinnerInput = z.infer<typeof AdvanceWinnerSchema>;
export type LockVotingInput = z.infer<typeof LockVotingSchema>;

export type MatchLiveData = z.infer<typeof MatchLivePayload>;
export type ScoreSubmittedData = z.infer<typeof ScoreSubmittedPayload>;
export type MatchCompleteData = z.infer<typeof MatchCompletePayload>;
export type ScoreLockedData = z.infer<typeof ScoreLockedPayload>;
export type RegistrationWithdrawnData = z.infer<typeof RegistrationWithdrawnPayload>;
export type PhaseActivatedData = z.infer<typeof PhaseActivatedPayload>;
export type PhaseCompletedData = z.infer<typeof PhaseCompletedPayload>;
export type BracketGeneratedData = z.infer<typeof BracketGeneratedPayload>;
export type LeaderboardUpdateData = z.infer<typeof LeaderboardUpdatePayload>;

export interface ServerToClientEvents {
  match_live: (data: MatchLiveData) => void;
  score_submitted: (data: ScoreSubmittedData) => void;
  match_complete: (data: MatchCompleteData) => void;
  score_locked: (data: ScoreLockedData) => void;
  registration_withdrawn: (data: RegistrationWithdrawnData) => void;
  phase_activated: (data: PhaseActivatedData) => void;
  phase_completed: (data: PhaseCompletedData) => void;
  bracket_generated: (data: BracketGeneratedData) => void;
  leaderboard_update: (data: LeaderboardUpdateData) => void;
  event_state: (matches: unknown[]) => void;
  match_updated: (data: { match: unknown; score: unknown }) => void;
  dancer_updated: (data: { judgeSlotId: string; registrationId: string; roundFormatId: string; score: number }) => void;
}

export interface ClientToServerEvents {
  join_event_room: (data: JoinRoomInput, ack: (res: { ok: boolean; error?: string }) => void) => void;
  push_match_live: (data: PushMatchLiveInput) => void;
  submit_score: (data: SubmitScoreInput, ack: (res: { ok: boolean; aggregate: { scoreRed: number; scoreBlue: number; judgeCount: number } }) => void) => void;
  advance_winner: (data: AdvanceWinnerInput, ack: (res: { ok: boolean; bracket?: unknown[] }) => void) => void;
  lock_voting: (data: LockVotingInput) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId?: string;
  role?: "judge" | "organizer" | "viewer";
  eventId?: string;
  judgeSlotId?: string;
}