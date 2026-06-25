"use client";

export default function RecenterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-panel absolute bottom-24 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition hover:border-emerald-400/40 sm:bottom-8 sm:right-4"
      aria-label="Recenter on your location"
      title="Recenter"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-emerald-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    </button>
  );
}
