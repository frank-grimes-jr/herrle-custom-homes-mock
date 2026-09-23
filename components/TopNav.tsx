import Link from "next/link";
import Image from "next/image";
import { Settings } from "lucide-react";
import logo from "@/public/logo.webp";

export function TopNav({ active }: { active: "overview" | "board" | "inbox" | "admin" }) {
  const cls = (key: string) =>
    `text-sm transition-colors ${
      active === key ? "font-bold text-ink" : "text-muted hover:text-ink"
    }`;
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
      <Link href="/" aria-label="Herrle Custom Homes — home" className="inline-flex">
        <Image src={logo} alt="Herrle Custom Homes" priority style={{ height: 52, width: "auto" }} />
      </Link>
      <nav className="flex items-center gap-6">
        <Link href="/" className={cls("overview")}>
          Overview
        </Link>
        <Link href="/board" className={cls("board")}>
          Board
        </Link>
        <Link href="/triage" className={cls("inbox")}>
          Inbox
        </Link>
        <Link
          href="/admin"
          aria-label="Admin & integrations"
          className={active === "admin" ? "text-ink" : "text-muted hover:text-ink"}
        >
          <Settings size={16} aria-hidden />
        </Link>
      </nav>
    </header>
  );
}
