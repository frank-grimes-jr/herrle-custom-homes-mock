import { TopNav } from "@/components/TopNav";
import { Board } from "@/components/board/Board";
import { getDashboard } from "@/lib/data";

export default async function Page() {
  const { attention } = await getDashboard();
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <TopNav active="board" />
      <div className="mb-1">
        <h1 className="font-serif text-2xl text-ink">High-level efforts</h1>
        <p className="mt-1 text-sm text-muted">
          Click a lane or card to rename it, and drag cards between lanes as work moves forward.
        </p>
      </div>
      <div className="mt-6">
        <Board attention={attention} />
      </div>
    </main>
  );
}
