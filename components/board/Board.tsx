"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { Board as BoardT, Card, Lane, Standup } from "@/lib/board/types";
import type { AttentionItem } from "@/lib/data/types";
import { defaultBoard } from "@/lib/board/mock";
import { sampleStandup } from "@/lib/board/sample-standup";

const KEY = "herrle-board-v1";
const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;

// ——— small reusable inline editor (lane names + card fields) ———
function InlineEdit({
  value,
  onSave,
  className = "",
  placeholder = "",
  multiline = false,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);

  if (!editing) {
    return (
      <span
        onClick={() => setEditing(true)}
        className={`cursor-text ${!value ? "text-muted/60" : ""} ${className}`}
      >
        {value || placeholder}
      </span>
    );
  }
  const commit = () => {
    setEditing(false);
    const t = text.trim();
    if (t !== value) onSave(t);
    else setText(value);
  };
  const shared =
    "w-full rounded border border-line bg-canvas px-1.5 py-1 text-inherit outline-none focus:border-primary";
  return multiline ? (
    <textarea
      autoFocus
      rows={2}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") { setText(value); setEditing(false); }
      }}
      className={`${shared} resize-none ${className}`}
    />
  ) : (
    <input
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
        if (e.key === "Escape") { setText(value); setEditing(false); }
      }}
      className={`${shared} ${className}`}
    />
  );
}

function AddInput({ onAdd, placeholder }: { onAdd: (v: string) => void; placeholder: string }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        if (t) { onAdd(t); setText(""); }
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-dashed border-line bg-transparent px-3 py-2 text-sm text-muted outline-none placeholder:text-muted/60 focus:border-primary focus:text-ink"
      />
    </form>
  );
}

export function Board({ attention }: { attention: AttentionItem[] }) {
  const [board, setBoard] = useState<BoardT>(defaultBoard);
  const firstPersist = useRef(true);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [standupOpen, setStandupOpen] = useState(false);
  const [standup, setStandup] = useState<Standup | null>(null);

  // Load persisted board once, then persist on every subsequent change.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setBoard(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    if (firstPersist.current) { firstPersist.current = false; return; }
    try {
      localStorage.setItem(KEY, JSON.stringify(board));
    } catch {
      /* ignore */
    }
  }, [board]);

  const setLanes = (fn: (lanes: Lane[]) => Lane[]) => setBoard((b) => ({ lanes: fn(b.lanes) }));
  const mapLane = (id: string, fn: (l: Lane) => Lane) =>
    setLanes((lanes) => lanes.map((l) => (l.id === id ? fn(l) : l)));

  const addLane = (name: string) => setLanes((lanes) => [...lanes, { id: newId(), name, cards: [] }]);
  const renameLane = (id: string, name: string) => mapLane(id, (l) => ({ ...l, name }));
  const deleteLane = (id: string) => setLanes((lanes) => lanes.filter((l) => l.id !== id));
  const addCard = (laneId: string, title: string) =>
    mapLane(laneId, (l) => ({ ...l, cards: [...l.cards, { id: newId(), title }] }));
  const editCard = (laneId: string, cardId: string, patch: Partial<Card>) =>
    mapLane(laneId, (l) => ({
      ...l,
      cards: l.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
    }));
  const deleteCard = (laneId: string, cardId: string) =>
    mapLane(laneId, (l) => ({ ...l, cards: l.cards.filter((c) => c.id !== cardId) }));

  // Move a card from one lane to the end of another.
  const moveCard = (fromLaneId: string, cardId: string, toLaneId: string) => {
    if (fromLaneId === toLaneId) return;
    setLanes((lanes) => {
      const card = lanes.find((l) => l.id === fromLaneId)?.cards.find((c) => c.id === cardId);
      if (!card) return lanes;
      return lanes.map((l) => {
        if (l.id === fromLaneId) return { ...l, cards: l.cards.filter((c) => c.id !== cardId) };
        if (l.id === toLaneId) return { ...l, cards: [...l.cards, card] };
        return l;
      });
    });
  };
  const moveDir = (laneId: string, cardId: string, dir: -1 | 1) => {
    const idx = board.lanes.findIndex((l) => l.id === laneId);
    const target = board.lanes[idx + dir];
    if (target) moveCard(laneId, cardId, target.id);
  };

  const resetBoard = () => {
    if (confirm("Reset the board to the starting layout? Your changes will be cleared.")) {
      setBoard(defaultBoard());
    }
  };

  // Static site → the standup is generated in the browser from the current
  // board + the dashboard's escalations. (On a Node host, swap this for a POST
  // to a route handler that calls Claude — the modal already handles both.)
  function runStandup() {
    setStandup(sampleStandup(board, attention));
    setStandupOpen(true);
  }

  const totalCards = board.lanes.reduce((n, l) => n + l.cards.length, 0);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {totalCards} efforts across {board.lanes.length} lanes ·{" "}
          <button onClick={resetBoard} className="underline decoration-line hover:text-ink">
            reset
          </button>
        </p>
        <button
          onClick={runStandup}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
        >
          <Sparkles size={15} />
          Run standup
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {board.lanes.map((lane, i) => (
          <div
            key={lane.id}
            onDragOver={(e) => { e.preventDefault(); setDragOver(lane.id); }}
            onDragLeave={() => setDragOver((d) => (d === lane.id ? null : d))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              try {
                const { fromLaneId, cardId } = JSON.parse(e.dataTransfer.getData("text/plain"));
                moveCard(fromLaneId, cardId, lane.id);
              } catch {
                /* ignore */
              }
            }}
            className={`flex w-72 shrink-0 flex-col rounded-xl border p-3 transition-colors ${
              dragOver === lane.id ? "border-primary bg-surface-2/50" : "border-line bg-surface-2/25"
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <InlineEdit
                value={lane.name}
                onSave={(v) => renameLane(lane.id, v || lane.name)}
                className="font-serif text-base text-ink"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted">{lane.cards.length}</span>
                <button
                  onClick={() => deleteLane(lane.id)}
                  className="text-muted/50 hover:text-terracotta"
                  aria-label="Delete lane"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {lane.cards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", JSON.stringify({ fromLaneId: lane.id, cardId: card.id }));
                  }}
                  className="group cursor-grab rounded-lg border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <InlineEdit
                      value={card.title}
                      onSave={(v) => editCard(lane.id, card.id, { title: v || card.title })}
                      className="text-sm font-medium leading-snug text-ink"
                    />
                    <button
                      onClick={() => deleteCard(lane.id, card.id)}
                      className="text-muted/0 transition-colors group-hover:text-muted/60 hover:!text-terracotta"
                      aria-label="Delete card"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    <InlineEdit
                      value={card.note ?? ""}
                      onSave={(v) => editCard(lane.id, card.id, { note: v || undefined })}
                      placeholder="Add a note…"
                      multiline
                    />
                  </div>
                  <div className="mt-2 flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => moveDir(lane.id, card.id, -1)}
                      disabled={i === 0}
                      className="rounded p-0.5 text-muted hover:text-ink disabled:opacity-30"
                      aria-label="Move left"
                    >
                      <ChevronLeft size={15} />
                    </button>
                    <button
                      onClick={() => moveDir(lane.id, card.id, 1)}
                      disabled={i === board.lanes.length - 1}
                      className="rounded p-0.5 text-muted hover:text-ink disabled:opacity-30"
                      aria-label="Move right"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2">
              <AddInput onAdd={(t) => addCard(lane.id, t)} placeholder="+ Add a card" />
            </div>
          </div>
        ))}

        <div className="w-64 shrink-0 pt-1">
          <AddInput onAdd={addLane} placeholder="+ Add a lane" />
        </div>
      </div>

      {standupOpen && standup && (
        <StandupModal standup={standup} onClose={() => setStandupOpen(false)} />
      )}
    </div>
  );
}

function StandupModal({
  standup,
  onClose,
}: {
  standup: Standup;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-[8vh]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-xl md:p-8"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-oak">Team standup</p>
            <h2 className="font-serif text-2xl text-ink">Worth bringing to everyone</h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p className="font-serif text-lg leading-relaxed text-ink">{standup.intro}</p>
            <ul className="mt-5 space-y-4">
              {standup.topics.map((t, i) => (
                <li key={i} className="border-l-2 border-oak/40 pl-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-medium text-ink">{t.title}</p>
                    {t.tag && (
                      <span className="shrink-0 text-[11px] uppercase tracking-wider text-muted">{t.tag}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted">{t.detail}</p>
                </li>
              ))}
            </ul>
      </div>
    </div>
  );
}
