import Link from "next/link";

export function TopNav({ active }: { active: "overview" | "board" | "inbox" }) {
  const cls = (key: string) =>
    `text-sm transition-colors ${
      active === key ? "font-medium text-ink" : "text-muted hover:text-ink"
    }`;
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <Link href="/" className="font-serif text-2xl tracking-tight text-primary">
          Herrle Custom Homes
        </Link>
        <nav className="flex gap-4">
          <Link href="/" className={cls("overview")}>
            Overview
          </Link>
          <Link href="/board" className={cls("board")}>
            Board
          </Link>
          <Link href="/triage" className={cls("inbox")}>
            Inbox
          </Link>
        </nav>
      </div>
      <p className="font-serif text-sm italic text-oak">Built with intention.</p>
    </header>
  );
}
