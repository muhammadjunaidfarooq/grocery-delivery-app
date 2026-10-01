import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { requireAuth, type AuthUser } from "@/lib/requireAuth";

/** Header the separate Socket.IO server must send on every call to this app. */
export const SOCKET_SECRET_HEADER = "x-socket-secret";

const sha256 = (value: string) => createHash("sha256").update(value).digest();

/**
 * True only when the request carries the shared secret from
 * SOCKET_SERVER_SECRET. Both values are hashed first so they have equal
 * length, then compared in constant time (timingSafeEqual throws on
 * different lengths and a plain === would leak timing information).
 * If the env var is not set, this always returns false.
 */
export function hasValidSocketSecret(req: Request): boolean {
  const expected = process.env.SOCKET_SERVER_SECRET;
  const provided = req.headers.get(SOCKET_SECRET_HEADER);
  if (!expected || !provided) return false;
  return timingSafeEqual(sha256(provided), sha256(expected));
}

type SocketAuthResult =
  | { via: "secret" }
  | { via: "session"; user: AuthUser }
  | { error: NextResponse };

/**
 * For routes that are called by the Socket.IO server (no browser cookie)
 * and may also be called by a logged-in user.
 *  - valid secret header -> { via: "secret" }
 *  - valid session       -> { via: "session", user }
 *  - neither             -> 401
 */
export async function requireSessionOrSocketSecret(
  req: Request,
): Promise<SocketAuthResult> {
  if (hasValidSocketSecret(req)) return { via: "secret" };

  const authResult = await requireAuth();
  if ("error" in authResult) {
    return {
      error: NextResponse.json(
        { message: "Unauthorized: login or valid socket secret required" },
        { status: 401 },
      ),
    };
  }
  return { via: "session", user: authResult.user };
}
