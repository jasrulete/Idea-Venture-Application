"use client";

import { distanceKm } from "@/lib/geo";
import type { PeerDot } from "@/lib/types";

function dotColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
}

export default function PeerListPanel({
  peers,
  me,
  canConnect,
  onPeerClick,
}: {
  peers: PeerDot[];
  me: { lat: number; lng: number } | null;
  canConnect: boolean;
  onPeerClick: (id: string) => void;
}) {
  const sorted = [...peers].sort((a, b) => {
    if (!me) return 0;
    return (
      distanceKm(me.lat, me.lng, a.lat, a.lng) -
      distanceKm(me.lat, me.lng, b.lat, b.lng)
    );
  });

  return (
    <div className="absolute inset-0 z-[5] overflow-y-auto overscroll-contain bg-zinc-950/95 pt-20 pb-28">
      <div className="mx-auto max-w-lg px-4">
        <h2 className="mb-1 text-sm font-semibold text-zinc-200">
          Nearby strangers
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          Sorted by approximate distance (privacy-offset coordinates).
        </p>

        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-zinc-900/50 px-6 py-12 text-center">
            <p className="text-sm text-zinc-400">No one else online yet.</p>
            <p className="mt-1 text-xs text-zinc-600">
              Open another window to test with two users.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((peer) => {
              const km = me
                ? distanceKm(me.lat, me.lng, peer.lat, peer.lng)
                : null;
              const distLabel =
                km === null
                  ? "—"
                  : km < 1
                    ? `${Math.round(km * 1000)} m`
                    : `${km.toFixed(1)} km`;

              return (
                <li key={peer.id}>
                  <button
                    type="button"
                    disabled={!canConnect || peer.busy}
                    onClick={() => onPeerClick(peer.id)}
                    className="glass-panel flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:border-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span
                      className={`h-3 w-3 shrink-0 rounded-full border-2 border-white/80 ${
                        peer.busy ? "pulse-dot--busy-static" : ""
                      }`}
                      style={
                        peer.busy
                          ? undefined
                          : { background: dotColor(peer.id) }
                      }
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-200">
                        {peer.busy ? "In a conversation" : "Available stranger"}
                      </span>
                      <span className="text-xs text-zinc-500">
                        ~{distLabel} away
                      </span>
                    </span>
                    {!peer.busy && canConnect && (
                      <span className="shrink-0 text-xs font-medium text-emerald-400">
                        Connect
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
