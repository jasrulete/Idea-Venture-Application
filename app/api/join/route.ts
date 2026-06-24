import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyPrivacyOffset, isValidLatLng } from "@/lib/geo";
import { getClientIp, isSessionId, newSessionSecret } from "@/lib/security";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/join — body { id, lat, lng } (raw coords).
// Applies a 1–3 km privacy offset and creates the presence row. Raw
// coordinates are never stored.
export async function POST(request: NextRequest) {
  const limited = rateLimitResponse(
    `join:${getClientIp(request)}`,
    10,
    60_000,
  );
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  const { id, lat, lng } = (body ?? {}) as Record<string, unknown>;

  if (!isSessionId(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }
  if (!isValidLatLng(lat, lng)) {
    return Response.json({ error: "invalid coordinates" }, { status: 400 });
  }

  const secret = newSessionSecret();
  const offset = applyPrivacyOffset(lat as number, lng as number);

  try {
    await prisma.presence.create({
      data: {
        id,
        secret,
        lat: offset.lat,
        lng: offset.lng,
        busy: false,
        lastSeen: new Date(),
      },
    });
  } catch {
    return Response.json({ error: "id already in use" }, { status: 409 });
  }

  return Response.json({ ok: true, secret });
}
