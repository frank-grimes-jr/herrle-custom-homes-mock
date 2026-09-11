import { TopNav } from "@/components/TopNav";
import { Board } from "@/components/board/Board";
import { getDashboard } from "@/lib/data";

export default async function Page() {
  const { attention } = await getDashboard();
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <TopNav active="board" />
      <div className="mb-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-oak">Dave&rsquo;s board</p>
        <h1 className="font-serif text-2xl text-ink">High-level efforts</h1>
        <p className="mt-1 text-sm text-muted">
          Business efforts, not projects — rename lanes, add cards, and move them forward as they
          progress. Your board saves automatically.
        </p>
      </div>
      <div className="mt-6">
        <Board attention={attention} />
      </div>
    </main>
  );
}
