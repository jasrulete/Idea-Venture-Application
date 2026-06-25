"use client";

import { useEffect, useRef, useState } from "react";

export default function VideoPanel({
  localStream,
  remoteStream,
  onEnd,
  onToggleAudio,
  onToggleVideo,
  onSwitchCamera,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEnd: () => void;
  onToggleAudio: () => boolean;
  onToggleVideo: () => boolean;
  onSwitchCamera: () => void;
}) {
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);

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
    <div className="relative z-[25] flex h-[38dvh] min-h-[180px] shrink-0 flex-col border-b border-white/10 bg-black sm:absolute sm:left-0 sm:top-0 sm:h-auto sm:max-h-[45vh] sm:w-[calc(100%-min(28rem,100%))] sm:border-b-0 sm:border-r">
      <div className="relative min-h-0 flex-1">
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

        <div className="absolute bottom-3 right-3 z-10 overflow-hidden rounded-xl border-2 border-white/25 bg-zinc-900 shadow-2xl ring-1 ring-black/60 sm:bottom-4 sm:right-4 sm:rounded-2xl">
          <video
            ref={localRef}
            autoPlay
            playsInline
            muted
            className="video-mirror block h-24 w-20 object-cover sm:h-36 sm:w-28"
          />
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90">
            You
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-center gap-2 border-t border-white/5 bg-zinc-950/90 px-3 py-2.5 backdrop-blur-sm sm:gap-3 sm:py-3">
        <ControlButton
          label={muted ? "Unmute" : "Mute"}
          active={!muted}
          onClick={() => setMuted(!onToggleAudio())}
        >
          {muted ? "🔇" : "🎤"}
        </ControlButton>
        <ControlButton
          label={camOff ? "Camera on" : "Camera off"}
          active={!camOff}
          onClick={() => setCamOff(!onToggleVideo())}
        >
          {camOff ? "📷" : "🎥"}
        </ControlButton>
        <ControlButton label="Flip camera" onClick={onSwitchCamera}>
          🔄
        </ControlButton>
        <ControlButton label="End video" danger onClick={onEnd}>
          ✕
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  children,
  label,
  onClick,
  active = true,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm transition sm:h-11 sm:w-11 ${
        danger
          ? "bg-red-500/90 text-white hover:bg-red-400"
          : active
            ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
            : "bg-red-500/20 text-red-300 ring-1 ring-red-500/40"
      }`}
    >
      {children}
    </button>
  );
}
