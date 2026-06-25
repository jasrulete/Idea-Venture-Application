// Client-side helpers for talking to the coordination API.
import type { PollResponse, SignalType } from "@/lib/types";

export async function join(
  id: string,
  lat: number,
  lng: number,
): Promise<{ secret: string; lat: number; lng: number }> {
  const res = await fetch("/api/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, lat, lng }),
  });
  if (!res.ok) throw new Error(`join failed: ${res.status}`);
  const data = (await res.json()) as {
    secret?: string;
    lat?: number;
    lng?: number;
  };
  if (!data.secret || typeof data.lat !== "number" || typeof data.lng !== "number") {
    throw new Error("join missing session data");
  }
  return { secret: data.secret, lat: data.lat, lng: data.lng };
}

export async function poll(id: string, secret: string): Promise<PollResponse> {
  const qs = new URLSearchParams({ id, secret });
  const res = await fetch(`/api/poll?${qs.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`poll failed: ${res.status}`);
  return res.json();
}

export async function sendSignal(
  fromId: string,
  secret: string,
  toId: string,
  type: SignalType,
  payload?: string,
): Promise<void> {
  await fetch("/api/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromId, secret, toId, type, payload }),
  });
}

// Fire-and-forget leave that survives the tab closing.
export function leave(id: string, secret: string): void {
  const body = JSON.stringify({ id, secret });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/leave", body);
  } else {
    void fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  }
}
