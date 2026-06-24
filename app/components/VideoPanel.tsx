"use client";

import { useEffect, useRef } from "react";

export default function VideoPanel({
  localStream,
  remoteStream,
  onEnd,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEnd: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = localRef.current;
    if (!el || !localStream) return;
    el.srcObject = localStream;
    void el.play().catch(() => {});
  }, [localStream]);

  useEffect(() => {
    const el = remoteRef.current;
    if (!el || !remoteStream) return;
    el.srcObject = remoteStream;
    void el.play().catch(() => {});
  }, [remoteStream]);

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black">
      <div className="relative min-h-0 flex-1">
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

        {!remoteStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
            <p className="text-sm">Waiting for stranger&apos;s video…</p>
          </div>
        )}

        <div className="absolute bottom-6 right-6 z-10 overflow-hidden rounded-2xl border-2 border-white/25 bg-zinc-900 shadow-2xl ring-1 ring-black/60">
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="block h-36 w-28 object-cover sm:h-44 sm:w-32"
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90">
            You
          </span>
        </div>
      </div>

      <div className="flex shrink-0 justify-center border-t border-white/5 bg-zinc-950/90 px-4 py-5 backdrop-blur-sm">
        <button
          onClick={onEnd}
          className="glass-panel rounded-full px-8 py-3 font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
        >
          End video
        </button>
      </div>
    </div>
  );
}
