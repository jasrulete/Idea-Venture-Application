"use client";

// Reusable centered prompt for "someone wants to connect" and
// "someone wants to start video".
export default function ConnectionPrompt({
  title,
  subtitle,
  acceptLabel,
  declineLabel,
  onAccept,
  onDecline,
}: {
  title: string;
  subtitle?: string;
  acceptLabel: string;
  declineLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6">
      <div
        className="glass-panel animate-scale-in w-full max-w-sm rounded-3xl p-8 text-center text-zinc-100 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/30">
          <span className="relative flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
            <span className="relative h-4 w-4 rounded-full bg-emerald-400" />
          </span>
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{subtitle}</p>
        )}
        <div className="mt-8 flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 rounded-full border border-zinc-600/80 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-400 hover:bg-zinc-800/50"
          >
            {declineLabel}
          </button>
          <button
            onClick={onAccept}
            className="flex-1 rounded-full bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300"
          >
            {acceptLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
