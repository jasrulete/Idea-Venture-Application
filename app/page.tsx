"use client";

import { useState } from "react";
import EntryGate from "./components/EntryGate";
import LiveView from "./components/LiveView";

export default function Home() {
  const [phase, setPhase] = useState<"gate" | "live">("gate");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [nickname, setNickname] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );

  if (phase === "gate") {
    return (
      <EntryGate
        onReady={(lat, lng, nick) => {
          setNickname(nick);
          setCoords({ lat, lng });
          setPhase("live");
        }}
      />
    );
  }

  if (!coords) return null;

  return (
    <LiveView sessionId={sessionId} nickname={nickname} coords={coords} />
  );
}
