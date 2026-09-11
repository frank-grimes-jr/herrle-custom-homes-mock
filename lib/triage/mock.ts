// Mock inbox for the email-triage MVP. Synthetic but realistic for a shoreline
// custom builder, and deliberately tied to the dashboard's projects (the
// Delano/Hawk's Nest window delay, the Sill Lane contract, Pruitt/Eightmile
// behind, Harmon selections) so the two MVPs feel like one system.
//
// Each email carries an `analysis` used to build the deterministic SAMPLE digest
// (the zero-setup fallback). The real Claude path gets only the raw email fields.
import type { Bucket, Digest, Email, Period, Sentiment, Urgency } from "./types";
import { SECTION_TITLES } from "./types";

type Analysis = {
  bucket: Bucket;
  sentiment: Sentiment;
  urgency: Urgency;
  summary: string;
  suggestedAction?: string;
};
type MockEmail = Email & { period: Period; analysis: Analysis };

const INBOX: MockEmail[] = [
  // ——— MORNING (overnight) ———
  {
    id: "m1", period: "morning", role: "client", project: "Hawk's Nest Bluff",
    from: "Karen Delano <kdelano@gmail.com>", subject: "Are we going to miss our move-in?",
    receivedAt: "2026-09-11T04:42:00",
    body: "David — we heard the windows might be delayed again. If this pushes our move-in past the holidays we're going to be very upset. Please call us.",
    analysis: { bucket: "needs_you", sentiment: "negative", urgency: "high", summary: "The Delanos are upset the window delay may push move-in past the holidays — they asked you to call.", suggestedAction: "Call the Delanos this morning, ahead of Marvin's confirmation, so they hear it from you first." },
  },
  {
    id: "m2", period: "morning", role: "vendor", project: "Hawk's Nest Bluff",
    from: "Marvin Windows & Doors <orders@marvin-dealer.com>", subject: "Shipment update: order #HN-2231",
    receivedAt: "2026-09-11T05:58:00",
    body: "Please note the black-frame window package for the Hawk's Nest project is delayed approximately two weeks due to a glass supplier backlog. Revised ship date to follow.",
    analysis: { bucket: "needs_you", sentiment: "neutral", urgency: "high", summary: "Marvin confirms a ~2-week window delay on Hawk's Nest — this is the root of the Delanos' worry.", suggestedAction: "Get a firm revised date, then give the Delanos a concrete recovery plan." },
  },
  {
    id: "m3", period: "morning", role: "lead",
    from: "Website <no-reply@herrlecustomhomes.com>", subject: "New inquiry — Old Saybrook new build",
    receivedAt: "2026-09-11T06:20:00",
    body: "New contact form: 'We own a waterfront lot in Old Saybrook and are looking to build a ~4,000 sf home, budget around $3M. Saw the Greystone project. Can we meet?'",
    analysis: { bucket: "needs_you", sentiment: "positive", urgency: "medium", summary: "Warm new lead: Old Saybrook waterfront new build, ~$3M, referenced Greystone.", suggestedAction: "Reply today while it's hot and get it on the intake calendar." },
  },
  {
    id: "m4", period: "morning", role: "architect", project: "Saltmeadow",
    from: "Nautilus Architects <studio@nautilusarch.com>", subject: "Revised stair details — Saltmeadow",
    receivedAt: "2026-09-11T07:05:00",
    body: "Attached are the revised stair and railing details incorporating your constructability notes. Let us know if these work before you frame.",
    analysis: { bucket: "needs_you", sentiment: "neutral", urgency: "medium", summary: "Nautilus sent revised Saltmeadow stair details — they need your OK before framing.", suggestedAction: "Review with Will before the stair gets framed; reply with any conflicts." },
  },
  {
    id: "m5", period: "morning", role: "authority", project: "Blackledge Point",
    from: "Town of Old Lyme Building Dept <building@oldlyme-ct.gov>", subject: "Inspection scheduled — 12 Beaver Brook",
    receivedAt: "2026-09-11T07:31:00",
    body: "Your framing inspection for the Blackledge Point residence is scheduled for Thursday 9:00 AM. Please ensure access and that framing is complete.",
    analysis: { bucket: "fyi", sentiment: "neutral", urgency: "medium", summary: "Blackledge framing inspection is set for Thursday 9 AM.", suggestedAction: "Confirm Alexa and the crew have it ready." },
  },
  {
    id: "m6", period: "morning", role: "vendor", project: "Eightmile Ridge",
    from: "Shoreline Lumber <ar@shorelinelumber.com>", subject: "Invoice #4471",
    receivedAt: "2026-09-11T02:10:00",
    body: "Invoice #4471 for the Eightmile Ridge order, $28,400, net 15. Statement attached.",
    analysis: { bucket: "fyi", sentiment: "neutral", urgency: "low", summary: "Eightmile lumber invoice, $28.4K, net 15 — routine.", suggestedAction: "Forward to Gayle for payment." },
  },
  {
    id: "m7", period: "morning", role: "personal",
    from: "CT Builders Association <news@ctba.org>", subject: "September Bulletin: code updates & events",
    receivedAt: "2026-09-11T03:00:00",
    body: "This month's bulletin covers energy-code updates and the fall networking dinner.",
    analysis: { bucket: "fyi", sentiment: "neutral", urgency: "low", summary: "Industry newsletter — nothing time-sensitive." },
  },

  // ——— AFTERNOON ———
  {
    id: "a1", period: "afternoon", role: "client", project: "Blackledge Point",
    from: "Tom Harmon <tharmon@me.com>", subject: "Primary bath tile — going with the zellige!",
    receivedAt: "2026-09-11T12:40:00",
    body: "We loved the samples. Let's go with the zellige for the primary bath. What do you need from us to lock it in?",
    analysis: { bucket: "needs_you", sentiment: "positive", urgency: "medium", summary: "The Harmons chose the zellige tile and want to lock the selection.", suggestedAction: "Confirm the SKU/quantity so Doug can order before it holds up the schedule." },
  },
  {
    id: "a2", period: "afternoon", role: "internal", project: "Eightmile Ridge",
    from: "Adam Pipkin <adam@herrlecustomhomes.com>", subject: "Heads up — Eightmile trim",
    receivedAt: "2026-09-11T13:15:00",
    body: "Our trim carpenter is out sick tomorrow. Eightmile punch list could slip a day unless we pull someone. Your call.",
    analysis: { bucket: "needs_you", sentiment: "neutral", urgency: "medium", summary: "Eightmile punch list may slip a day — trim carpenter out sick.", suggestedAction: "Decide whether to pull someone off Saltmeadow to hold the date." },
  },
  {
    id: "a3", period: "afternoon", role: "subcontractor", project: "Saltmeadow",
    from: "Cove Electric <dispatch@coveelectric.com>", subject: "Rough-in date for Saltmeadow?",
    receivedAt: "2026-09-11T14:02:00",
    body: "We're holding a slot for the Saltmeadow rough-in but need a confirmed date once the foundation's in. Can you advise?",
    analysis: { bucket: "fyi", sentiment: "neutral", urgency: "medium", summary: "Cove Electric needs a confirmed Saltmeadow rough-in date.", suggestedAction: "Give them a date once the foundation pour is scheduled." },
  },
  {
    id: "a4", period: "afternoon", role: "personal",
    from: "Chelsea Groton Bank <alerts@chelseagroton.com>", subject: "Your September statement is ready",
    receivedAt: "2026-09-11T11:20:00",
    body: "Your business account statement is now available online.",
    analysis: { bucket: "fyi", sentiment: "neutral", urgency: "low", summary: "Bank statement available — no action." },
  },

  // ——— EVENING ———
  {
    id: "e1", period: "evening", role: "lead", project: "Sill Lane Estate",
    from: "Robert Sill <rsill@sillfamily.com>", subject: "Ready to move forward",
    receivedAt: "2026-09-11T17:35:00",
    body: "We reviewed everything with our attorney and we're ready to sign. Please send the construction contract through DocuSign and we'll execute this week.",
    analysis: { bucket: "needs_you", sentiment: "positive", urgency: "high", summary: "Sill Lane ($6.2M) is ready to sign and wants the contract via DocuSign this week.", suggestedAction: "Have Gayle send the DocuSign tonight or first thing — this is the biggest deal in the pipeline." },
  },
  {
    id: "e2", period: "evening", role: "client", project: "Eightmile Ridge",
    from: "Janet Pruitt <jpruitt@outlook.com>", subject: "Checking in on timing",
    receivedAt: "2026-09-11T18:12:00",
    body: "We know things have been tight. Could you send us an updated completion date so we can plan movers? No rush tonight.",
    analysis: { bucket: "needs_you", sentiment: "neutral", urgency: "medium", summary: "The Pruitts (who've gone quiet) want a realistic updated Eightmile completion date.", suggestedAction: "Send a straight, realistic date tomorrow — rebuild trust before they lose it." },
  },
  {
    id: "e3", period: "evening", role: "vendor", project: "Whippoorwill Hollow",
    from: "Moyer's Landscaping <estimating@moyerslandscape.com>", subject: "Planting proposal — Whippoorwill",
    receivedAt: "2026-09-11T16:50:00",
    body: "Proposal attached for native plantings and stonework at Whippoorwill, phased for spring install.",
    analysis: { bucket: "fyi", sentiment: "neutral", urgency: "low", summary: "Landscaping proposal for Whippoorwill, phased for spring." },
  },
  {
    id: "e4", period: "evening", role: "personal",
    from: "BuildSaver Supply <deals@buildsaver-supply.biz>", subject: "Cut your material costs 40%!!",
    receivedAt: "2026-09-11T15:05:00",
    body: "Exclusive bulk pricing on framing packages. Reply now to claim your discount.",
    analysis: { bucket: "fyi", sentiment: "neutral", urgency: "low", summary: "Cold sales pitch — safe to ignore." },
  },
];

const SAMPLE_HEADLINE: Record<Period, string> = {
  morning:
    "Overnight: 7 emails, and two connect. The Delanos are upset about a window delay — and Marvin just confirmed it's real (~2 weeks). Call them before they escalate. On the upside, a warm ~$3M Old Saybrook lead came in overnight. Nautilus needs your OK on Saltmeadow stairs, and Blackledge's framing inspection is Thursday 9 AM.",
  afternoon:
    "This afternoon: 4 emails. The Harmons picked their tile — lock it so it doesn't stall Blackledge. Adam flagged that Eightmile's punch list could slip a day; that's a quick call. Cove Electric is waiting on a Saltmeadow date. Nothing on fire.",
  evening:
    "This evening: your biggest deal moved. Sill Lane ($6.2M) is ready to sign — get the DocuSign out. The Pruitts, who've been quiet, asked for a realistic Eightmile date; send it tomorrow and rebuild trust. A landscaping proposal and one cold pitch can wait.",
};

// Raw emails for a period — what a live Gmail fetch would hand the model.
export function rawInbox(period: Period): Email[] {
  return INBOX.filter((e) => e.period === period).map(({ analysis, period: _p, ...e }) => e);
}

// Deterministic sample digest (the zero-setup fallback). Groups the pre-analyzed
// mock into the three buckets and uses a hand-written narrative headline.
export function buildSampleDigest(period: Period): Digest {
  const emails = INBOX.filter((e) => e.period === period);
  const order: Bucket[] = ["needs_you", "sentiment", "fyi"];
  const sections = order
    .map((key) => ({
      key,
      title: SECTION_TITLES[key],
      items: emails
        .filter((e) => e.analysis.bucket === key)
        .map((e) => ({
          emailId: e.id,
          from: e.from,
          subject: e.subject,
          sentiment: e.analysis.sentiment,
          urgency: e.analysis.urgency,
          summary: e.analysis.summary,
          suggestedAction: e.analysis.suggestedAction,
          project: e.project,
        })),
    }))
    .filter((s) => s.items.length > 0);

  return {
    period,
    generatedAt: new Date().toISOString(),
    source: "sample",
    headline: SAMPLE_HEADLINE[period],
    counts: {
      total: emails.length,
      needsYou: emails.filter((e) => e.analysis.bucket === "needs_you").length,
      flagged: emails.filter((e) => e.analysis.sentiment === "negative").length,
    },
    sections,
  };
}
