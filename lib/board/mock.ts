// Default board Dave starts from (business/portfolio efforts, not projects).
// He reshapes lanes and carries cards forward; his edits persist in the browser.
import type { Board } from "./types";

export function defaultBoard(): Board {
  return {
    lanes: [
      {
        id: "ideas",
        name: "Ideas & Someday",
        cards: [
          { id: "c-showroom", title: "Open a selections studio in Old Lyme", note: "A showroom for finishes so clients decide faster and on-brand." },
          { id: "c-spec", title: "Spec-build one home on a shoreline lot" },
          { id: "c-timberline", title: "Add a dedicated timber-frame / millwork line" },
        ],
      },
      {
        id: "quarter",
        name: "This Quarter",
        cards: [
          { id: "c-hire", title: "Hire a second lead carpenter", note: "Capacity is the bottleneck on taking a 6th build." },
          { id: "c-selections", title: "Systematize the client selections process" },
          { id: "c-software", title: "Get the team to 80% software adoption", note: "2 seats idle last week." },
        ],
      },
      {
        id: "motion",
        name: "In Motion",
        cards: [
          { id: "c-dashboard", title: "Stand up the company health dashboard" },
          { id: "c-onboarding", title: "Refine the client onboarding packet" },
          { id: "c-changeorder", title: "Formalize the change-order workflow", note: "Hawk's Nest CO#3 slipped 11 days." },
        ],
      },
      {
        id: "waiting",
        name: "Waiting On",
        cards: [
          { id: "c-close", title: "Q3 books closed", note: "With Gayle / CPA." },
          { id: "c-sill", title: "Sill Lane contract signed", note: "$6.2M — sent, awaiting signature." },
        ],
      },
      {
        id: "landed",
        name: "Landed",
        cards: [
          { id: "c-brand", title: "New brand site + New England Living feature" },
          { id: "c-alexa", title: "Hired Alexa as PM / project documentation" },
        ],
      },
    ],
  };
}
