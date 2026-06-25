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
  onSend,
  onStartVideo,
  onEnd,
  compact,
}: {
  messages: ChatMessage[];
  connected: boolean;
  videoBusy: boolean;
  onSend: (text: string) => void;
  onStartVideo: () => void;
  onEnd: () => void;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [keyboardInset, setKeyboardInset] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const prevCount = useRef(messages.length);

  useEffect(() => {
    if (messages.length > prevCount.current) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    prevCount.current = messages.length;
  }, [messages]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const syncKeyboardInset = () => {
      const inset = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop,
      );
      setKeyboardInset(inset);
    };

    syncKeyboardInset();
    vv.addEventListener("resize", syncKeyboardInset);
    vv.addEventListener("scroll", syncKeyboardInset);
    return () => {
      vv.removeEventListener("resize", syncKeyboardInset);
      vv.removeEventListener("scroll", syncKeyboardInset);
    };
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !connected) return;
    onSend(text);
    setDraft("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleInputFocus() {
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    }, 300);
  }

  return (
    <div
      className={`glass-panel z-20 flex min-h-0 flex-col border-white/5 shadow-2xl isolate ${
        compact
          ? "relative min-h-0 flex-1 border-t sm:max-w-md sm:flex-1 sm:border-l sm:border-t-0"
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
            <p className="truncate font-semibold">Stranger</p>
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
        ref={formRef}
        onSubmit={submit}
        style={{
          paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom, 0px), 0.75rem)`,
        }}
        className="sticky bottom-0 z-10 flex shrink-0 gap-2 border-t border-zinc-800 bg-[var(--surface-glass)] p-3 backdrop-blur-md"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={connected ? "Type a message…" : "Connecting…"}
          disabled={!connected}
          enterKeyHint="send"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-full border border-white/5 bg-zinc-900/80 px-4 py-2.5 text-base outline-none placeholder:text-zinc-600 focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30 disabled:opacity-50 sm:text-sm"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-zinc-950 shadow-md ring-2 ring-emerald-400/30 transition hover:bg-emerald-300 active:scale-95 disabled:opacity-40 disabled:shadow-none sm:h-11 sm:w-11"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
            aria-hidden
          >
            <path d="M3.4 20.6 21 12 3.4 3.4l-.9 8.4 7.2 1.6-7.2 1.6.9 8.4z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
