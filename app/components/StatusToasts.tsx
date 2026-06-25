"use client";

export default function RequestingToast({
  onCancel,
}: {
  onCancel: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4 sm:top-6">
      <div className="glass-panel pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-xl">
        <span className="inline-block h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-zinc-400/30 border-t-emerald-400" />
        <span className="flex-1 text-sm text-zinc-200">Requesting connection…</span>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-full bg-zinc-700/80 px-3 py-1 text-xs transition hover:bg-zinc-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function VideoWaitingToast() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4 sm:top-6">
      <div className="glass-panel pointer-events-none flex max-w-md items-center gap-2 rounded-2xl px-4 py-3 text-sm text-zinc-200 shadow-xl">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-400/30 border-t-emerald-400" />
        Waiting for stranger to accept video…
      </div>
    </div>
  );
}
