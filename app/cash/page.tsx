import Link from "next/link";
import { getFinancials } from "@/lib/data";
import { TopNav } from "@/components/TopNav";
import { CashForecast } from "@/components/cash/CashForecast";

export default async function Page() {
  const f = await getFinancials();
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <TopNav active="overview" />
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted hover:text-ink">
          ← Overview
        </Link>
        <h1 className="mt-2 font-serif text-3xl text-ink">Cash outlook</h1>
      </div>
      <CashForecast f={f} />
    </main>
  );
}
