import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getClientIp } from "@/lib/security";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/leave — body { id, secret }. Removes the presence row and any
// pending signals to/from this user. Called via navigator.sendBeacon on tab
// close, so the body may arrive as text — parse defensively.
export async function POST(request: NextRequest) {
  const limited = rateLimitResponse(
    `leave:${getClientIp(request)}`,
    30,
    60_000,
  );
  if (limited) return limited;

  let parsed: { id?: unknown; secret?: unknown } | undefined;
  try {
    const text = await request.text();
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = undefined;
  }

  const id = parsed?.id;
  const secret = parsed?.secret;

  const session = await requireSession(id, secret);
  if (!session.ok) {
    return Response.json({ error: session.error }, { status: session.status });
  }

  // Independent cleanup deletes — no atomicity needed (and interactive
  // transactions are unreliable over a PgBouncer pooler).
  await prisma.signal.deleteMany({
    where: { OR: [{ toId: session.id }, { fromId: session.id }] },
  });
  await prisma.presence.deleteMany({ where: { id: session.id } });

  return Response.json({ ok: true });
}
