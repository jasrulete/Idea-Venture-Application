"use client";

import { useState } from "react";

export default function EntryGate({
  onReady,
}: {
  onReady: (lat: number, lng: number) => void;
}) {
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");
  const [error, setError] = useState("");

  function enter() {
    if (!("geolocation" in navigator)) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => onReady(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is required to place you on the map."
            : "Couldn't get your location. Please try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-1 flex-col items-center justify-center overflow-hidden bg-[var(--background)] p-6 text-zinc-100 grain-overlay">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-teal-500/5 blur-3xl" />
      </div>

      <div className="animate-fade-up relative z-10 flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.25em] text-emerald-400/80">
            Anonymous · Ephemeral · Global
          </p>
          <h1 className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
            Pulse
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-zinc-400">
            A living globe of strangers. Drop onto the map, tap a dot, start
            talking.
          </p>
        </div>

        <button
          onClick={enter}
          disabled={status === "locating"}
          className="group relative w-full overflow-hidden rounded-full bg-emerald-400 px-10 py-3.5 font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 hover:shadow-emerald-500/30 disabled:opacity-60 sm:w-auto"
        >
          {status === "locating" ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />
              Locating…
            </span>
          ) : (
            "Enter Pulse"
          )}
        </button>

        {status === "error" && (
          <p className="max-w-sm text-sm text-red-400 animate-fade-up">{error}</p>
        )}

        <p className="max-w-xs text-xs leading-relaxed text-zinc-600">
          No sign-up. Your dot is placed 1–3&nbsp;km from your real location.
          Close the tab — everything disappears.
        </p>
      </div>
    </div>
  );
}
