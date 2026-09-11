// Small shared UI maps (status → color). Kept out of components so the
// palette stays in one place.
import type { ScheduleStatus } from "./data/types";

export const sevDot: Record<"escalate" | "watch" | "ok", string> = {
  escalate: "bg-terracotta",
  watch: "bg-amber",
  ok: "bg-sage",
};

export const sevText: Record<"escalate" | "watch" | "ok", string> = {
  escalate: "text-terracotta",
  watch: "text-amber",
  ok: "text-sage",
};

export const scheduleMeta: Record<ScheduleStatus, { label: string; text: string; dot: string }> = {
  on_track: { label: "On track", text: "text-sage", dot: "bg-sage" },
  at_risk: { label: "At risk", text: "text-amber", dot: "bg-amber" },
  behind: { label: "Behind", text: "text-terracotta", dot: "bg-terracotta" },
};

export const sentimentMeta: Record<"positive" | "neutral" | "at_risk", { label: string; text: string }> = {
  positive: { label: "Positive", text: "text-sage" },
  neutral: { label: "Neutral", text: "text-muted" },
  at_risk: { label: "At risk", text: "text-terracotta" },
};
