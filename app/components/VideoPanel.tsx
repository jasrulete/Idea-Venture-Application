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
      <div className="relative flex-1">
        {/* Remote (full screen) */}
        <video
          ref={remoteRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
        {!remoteStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-emerald-400" />
            <p className="text-sm">Waiting for stranger&apos;s video…</p>
          </div>
        )}
        </div>
        {/* Local (picture-in-picture) */}
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute bottom-6 right-6 h-44 w-32 rounded-2xl border-2 border-white/20 bg-zinc-900 object-cover shadow-2xl ring-1 ring-black/50 sm:h-48 sm:w-36"
        />
      </div>
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
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
