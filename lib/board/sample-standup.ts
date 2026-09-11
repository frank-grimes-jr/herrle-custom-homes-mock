// Client-safe deterministic standup builder (no SDK, no server-only), so the
// board can generate a standup entirely in the browser on the static site.
// Pulls cards from the "active" lanes plus the dashboard's top escalations.
import type { Board, Standup, StandupTopic } from "./types";
import type { AttentionItem } from "../data/types";

const PARKED = /idea|someday|landed|done|archive/i;

export function sampleStandup(board: Board, attention: AttentionItem[]): Standup {
  const topics: StandupTopic[] = [];

  for (const lane of board.lanes) {
    if (PARKED.test(lane.name)) continue;
    for (const card of lane.cards) {
      if (topics.length >= 4) break;
      topics.push({
        title: card.title,
        detail: card.note ?? "Where does this stand, and who owns the next step?",
        tag: lane.name,
      });
    }
  }

  for (const item of attention.filter((a) => a.severity === "escalate").slice(0, 2)) {
    topics.push({ title: item.title, detail: item.detail, tag: "Escalation" });
  }

  return {
    source: "sample",
    generatedAt: new Date().toISOString(),
    intro: `${topics.length} things worth putting in front of the team: a few efforts in motion and the escalations from this week's numbers.`,
    topics,
  };
}
