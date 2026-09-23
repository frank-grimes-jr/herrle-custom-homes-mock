import { getDigest } from "@/lib/triage/digest";
import type { Digest, Period } from "@/lib/triage/types";
import { TopNav } from "@/components/TopNav";
import { TriageBoard } from "@/components/triage/TriageBoard";

// Live email is fetched per request (never baked in at build time).
export const dynamic = "force-dynamic";

const PERIODS: Period[] = ["morning", "afternoon", "evening"];

export default async function Page() {
  const entries = await Promise.all(PERIODS.map(async (p) => [p, await getDigest(p)] as const));
  const digests = Object.fromEntries(entries) as Record<Period, Digest>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <TopNav active="inbox" />
      <TriageBoard digests={digests} />
    </main>
  );
}
