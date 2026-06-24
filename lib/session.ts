import { prisma } from "@/lib/prisma";
import { isSessionId, isSessionSecret } from "@/lib/security";

type SessionOk = {
  ok: true;
  id: string;
};

type SessionFail = {
  ok: false;
  status: 401 | 404;
  error: string;
};

export async function requireSession(
  id: unknown,
  secret: unknown,
): Promise<SessionOk | SessionFail> {
  if (!isSessionId(id)) {
    return { ok: false, status: 401, error: "invalid id" };
  }
  if (!isSessionSecret(secret)) {
    return { ok: false, status: 401, error: "invalid secret" };
  }

  const row = await prisma.presence.findUnique({
    where: { id },
    select: { secret: true },
  });

  if (!row) {
    return { ok: false, status: 404, error: "session not found" };
  }
  if (row.secret !== secret) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  return { ok: true, id };
}
