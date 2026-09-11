import Link from "next/link";
import { getSubs } from "@/lib/data";
import { TopNav } from "@/components/TopNav";
import { ComplianceList } from "@/components/compliance/ComplianceList";

export default async function Page() {
  const subs = await getSubs();
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <TopNav active="overview" />
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Overview
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-ink">Insurance &amp; liens</h1>
        <p className="mt-1 text-sm text-muted">
          Sub insurance certificates and lien waivers across active builds.
        </p>
      </div>
      <ComplianceList subs={subs} />
    </main>
  );
}
