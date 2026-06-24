import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SignalType } from "@/lib/types";
import { requireSession } from "@/lib/session";
import { getClientIp, isSessionId } from "@/lib/security";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: SignalType[] = [
  "request",
  "accept",
  "decline",
  "offer",
  "answer",
  "ice",
  "end",
];

const MAX_PAYLOAD = 64 * 1024; // SDP/ICE are small; cap to be safe.

// POST /api/signal — body { fromId, secret, toId, type, payload? }
// Drops one message into the recipient's mailbox. Also manages the `busy`
// flag so a user can only be in one connection at a time.
export async function POST(request: NextRequest) {
  const limited = rateLimitResponse(
    `signal:${getClientIp(request)}`,
    60,
    60_000,
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { fromId, toId, type, payload, secret } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (!isSessionId(fromId) || !isSessionId(toId)) {
    return Response.json({ error: "invalid ids" }, { status: 400 });
  }
  if (fromId === toId) {
    return Response.json({ error: "invalid target" }, { status: 400 });
  }
  if (typeof type !== "string" || !VALID_TYPES.includes(type as SignalType)) {
    return Response.json({ error: "invalid type" }, { status: 400 });
  }
  if (
    payload !== undefined &&
    payload !== null &&
    (typeof payload !== "string" || payload.length > MAX_PAYLOAD)
  ) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const session = await requireSession(fromId, secret);
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }

  const sender = await prisma.presence.findUnique({
    where: { id: fromId },
    select: { busy: true },
  });
  if (!sender) {
    return Response.json({ error: "session not found" }, { status: 404 });
  }

  const signalType = type as SignalType;
  const payloadStr = typeof payload === "string" ? payload : null;

  // Enforce "one active connection at a time": if the target is already busy,
  // auto-decline the request instead of delivering it.
  if (signalType === "request") {
    if (sender.busy) {
      return Response.json({ error: "sender busy" }, { status: 409 });
    }

    const target = await prisma.presence.findUnique({
      where: { id: toId },
      select: { busy: true },
    });
    if (!target) {
      await sendDecline(toId, fromId);
      return Response.json({ ok: true, autoDeclined: true });
    }
    if (target.busy) {
      await sendDecline(toId, fromId);
      return Response.json({ ok: true, autoDeclined: true });
    }
  }

  // Busy transitions:
  // - accept: the connection is now active → mark BOTH peers busy.
  // - decline/end: free both peers.
  if (signalType === "accept") {
    if (sender.busy) {
      return Response.json({ error: "sender busy" }, { status: 409 });
    }

    const target = await prisma.presence.findUnique({
      where: { id: toId },
      select: { busy: true },
    });
    if (!target) {
      return Response.json({ error: "target offline" }, { status: 404 });
    }
    if (target.busy) {
      return Response.json({ error: "target busy" }, { status: 409 });
    }

    await prisma.presence.updateMany({
      where: { id: { in: [fromId, toId] } },
      data: { busy: true },
    });
  } else if (signalType === "decline" || signalType === "end") {
    await prisma.presence.updateMany({
      where: { id: { in: [fromId, toId] } },
      data: { busy: false },
    });
  }

  if (
    signalType === "offer" ||
    signalType === "answer" ||
    signalType === "ice"
  ) {
    const target = await prisma.presence.findUnique({
      where: { id: toId },
      select: { busy: true },
    });
    if (!target || !sender.busy || !target.busy) {
      return Response.json({ error: "not connected" }, { status: 403 });
    }
  }

  await prisma.signal.create({
    data: { fromId, toId, type: signalType, payload: payloadStr },
  });

  return Response.json({ ok: true });
}

// Helper: deliver an auto-decline from `target` back to `initiator`.
async function sendDecline(targetId: string, initiatorId: string) {
  await prisma.signal.create({
    data: {
      fromId: targetId,
      toId: initiatorId,
      type: "decline",
      payload: null,
    },
  });
}
