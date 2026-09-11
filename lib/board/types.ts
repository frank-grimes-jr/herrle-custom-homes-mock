// Dave's high-level effort board. Cards are business/portfolio efforts
// ("epics" without the software) — NOT individual home projects. Lanes are
// bespoke: Dave renames/adds/removes them to fit how he works.

export type Card = {
  id: string;
  title: string;
  note?: string;
};

export type Lane = {
  id: string;
  name: string;
  cards: Card[];
};

export type Board = {
  lanes: Lane[];
};

// The "standup" output — topics worth bringing to the whole team.
export type StandupTopic = {
  title: string;
  detail: string;
  tag?: string; // e.g. lane name, "Escalation", "Win"
};

export type Standup = {
  source: "claude" | "sample";
  generatedAt: string;
  intro: string;
  topics: StandupTopic[];
};
