import { FeedbackStatus, FeedbackType } from "@/generated/prisma/enums";

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: "New",
  READ: "Read",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  FEEDBACK: "Feedback",
  DEMAND: "Demand",
};

export const FEEDBACK_STATUS_ORDER: FeedbackStatus[] = [
  FeedbackStatus.NEW,
  FeedbackStatus.READ,
  FeedbackStatus.IN_PROGRESS,
  FeedbackStatus.COMPLETED,
  FeedbackStatus.REJECTED,
];
