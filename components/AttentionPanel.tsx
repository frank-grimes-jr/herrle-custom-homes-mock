import type { AttentionItem } from "@/lib/data/types";
import { sevDot } from "@/lib/ui";

function ItemRow({ item }: { item: AttentionItem }) {
  return (
    <li className="flex gap-3 border-b border-line/60 py-3 last:border-0">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sevDot[item.severity]}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-ink">{item.title}</p>
          <span className="shrink-0 text-[11px] uppercase tracking-wider text-muted">{item.domain}</span>
        </div>
        <p className="text-sm text-muted">{item.detail}</p>
      </div>
    </li>
  );
}

function Column({ title, items, empty }: { title: string; items: AttentionItem[]; empty: string }) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-ink">{title}</h3>
      {items.length === 0 ? (
        <p className="py-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul>{items.map((i) => <ItemRow key={i.id} item={i} />)}</ul>
      )}
    </div>
  );
}

export function AttentionPanel({
  items,
  projectsOnTrack,
  projectsTotal,
}: {
  items: AttentionItem[];
  projectsOnTrack: number;
  projectsTotal: number;
}) {
  const escalate = items.filter((i) => i.severity === "escalate");
  const watch = items.filter((i) => i.severity === "watch");

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-oak">Where things stand</p>
          <h1 className="font-serif text-2xl text-ink md:text-3xl">What needs your attention</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-line bg-surface-2/50 px-3 py-1 text-terracotta">
            {escalate.length} to escalate
          </span>
          <span className="rounded-full border border-line bg-surface-2/50 px-3 py-1 text-amber">
            {watch.length} to watch
          </span>
          <span className="rounded-full border border-line bg-surface-2/50 px-3 py-1 text-sage">
            {projectsOnTrack}/{projectsTotal} projects on track
          </span>
        </div>
      </div>

      <div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
        <Column
          title="Escalate"
          items={escalate}
          empty="Nothing needs escalation right now — you're clear."
        />
        <Column title="Keep an eye on" items={watch} empty="Nothing on the watch list." />
      </div>
    </section>
  );
}
