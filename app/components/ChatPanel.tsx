"use client";

import { useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: number;
  mine: boolean;
  text: string;
}

export default function ChatPanel({
  messages,
  connected,
  videoBusy,
  peerLabel,
  onSend,
  onStartVideo,
  onEnd,
  compact,
}: {
  messages: ChatMessage[];
  connected: boolean;
  videoBusy: boolean;
  peerLabel: string;
  onSend: (text: string) => void;
  onStartVideo: () => void;
  onEnd: () => void;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevCount = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevCount.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    prevCount.current = messages.length;
  }, [messages]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    onSend(text);
    setDraft("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div
      className={`glass-panel z-20 flex min-h-0 flex-col border-white/5 shadow-2xl isolate ${
        compact
          ? "relative h-full flex-1 border-t"
          : "animate-fade-up absolute inset-x-0 bottom-0 max-h-[min(85dvh,100%)] border-t sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-full sm:w-full sm:max-w-md sm:border-l sm:border-t-0"
      }`}
    >
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            {connected ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </>
            ) : (
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{peerLabel}</p>
            <p className="text-xs text-zinc-500">
              {connected ? "Connected · P2P encrypted" : "Connecting…"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onStartVideo}
            disabled={!connected || videoBusy}
            className="rounded-full border border-zinc-700/80 px-2.5 py-1.5 text-xs transition hover:border-emerald-400/40 hover:bg-emerald-400/5 disabled:opacity-40 sm:px-3 sm:text-sm"
          >
            Video
          </button>
          <button
            type="button"
            onClick={onEnd}
            className="rounded-full bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-400 sm:px-3 sm:text-sm"
          >
            End
          </button>
        </div>
      </header>

      <div className="chat-scroll min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3 sm:p-4">
        {messages.length === 0 && (
          <div className="mt-8 flex flex-col items-center gap-2 text-center sm:mt-12">
            <span className="text-2xl opacity-40">💬</span>
            <p className="text-sm text-zinc-500">Say hello to a stranger</p>
            <p className="text-xs text-zinc-600">
              Messages never touch our servers
            </p>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.mine ? "justify-end" : "justify-start"}`}
          >
            <span
              className={`animate-fade-up max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                m.mine
                  ? "rounded-br-md bg-emerald-400 text-zinc-950"
                  : "rounded-bl-md bg-zinc-800/90 text-zinc-100"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={submit}
        className="flex shrink-0 gap-2 border-t border-zinc-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          enterKeyHint="send"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full border border-white/5 bg-zinc-900/80 px-4 py-2.5 text-base outline-none placeholder:text-zinc-600 focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30 disabled:opacity-50 sm:text-sm"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="shrink-0 rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40"
        >
          Send
        </button>
      </form>
    </div>
  );
}
