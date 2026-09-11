import Link from "next/link";
import Image from "next/image";
import logo from "@/public/logo.webp";

export function TopNav({ active }: { active: "overview" | "board" | "inbox" }) {
  const cls = (key: string) =>
    `text-sm transition-colors ${
      active === key ? "font-bold text-ink" : "text-muted hover:text-ink"
    }`;
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
      <Link href="/" aria-label="Herrle Custom Homes — home" className="inline-flex">
        <Image src={logo} alt="Herrle Custom Homes" priority style={{ height: 52, width: "auto" }} />
      </Link>
      <nav className="flex gap-6">
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
    </header>
  );
}
