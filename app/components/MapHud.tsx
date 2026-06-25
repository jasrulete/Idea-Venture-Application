"use client";

import type { PeerDot } from "@/lib/types";

export default function MapHud({ peerCount }: { peerCount: number }) {
  return (
    <div className="glass-panel animate-fade-up pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-2xl px-3 py-2 sm:left-4 sm:top-4 sm:px-4 sm:py-2.5">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-zinc-300">
          {peerCount} {peerCount === 1 ? "stranger" : "strangers"} nearby
        </p>
        <p className="text-[10px] text-zinc-500">Tap a dot or use the list</p>
      </div>
    </div>
  );
}

export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: "map" | "list";
  onChange: (mode: "map" | "list") => void;
}) {
  return (
    <div className="glass-panel absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 rounded-full p-1 sm:bottom-8">
      <button
        type="button"
        onClick={() => onChange("map")}
        className={`rounded-full px-4 py-2 text-xs font-medium transition ${
          mode === "map"
            ? "bg-emerald-400 text-zinc-950"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        Map
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`rounded-full px-4 py-2 text-xs font-medium transition ${
          mode === "list"
            ? "bg-emerald-400 text-zinc-950"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        List
      </button>
    </div>
  );
}
