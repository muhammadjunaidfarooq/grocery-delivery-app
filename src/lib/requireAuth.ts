import { auth } from "@/auth";
import { NextResponse } from "next/server";

export type Role = "user" | "deliveryBoy" | "admin";

export interface AuthUser {
  id: string;
  role: Role;
  name: string;
  email: string;
}

type AuthResult = { user: AuthUser } | { error: NextResponse };

/**
 * Reads the session and checks the role.
 *
 * Usage in a route:
 *   const authResult = await requireAuth(["admin"]);
 *   if ("error" in authResult) return authResult.error;
 *   const { user } = authResult;
 *
 * - No session          -> 401
 * - Role not allowed    -> 403
 * - `roles` omitted     -> any logged-in user is allowed
 */
export async function requireAuth(roles?: Role[]): Promise<AuthResult> {
  const session = await auth();
  const sessionUser = session?.user;

  if (!sessionUser?.id) {
    return {
      error: NextResponse.json(
        { message: "Unauthorized: please log in" },
        { status: 401 },
      ),
    };
  }

  const role = sessionUser.role as Role;
  if (roles && !roles.includes(role)) {
    return {
      error: NextResponse.json(
        { message: "Forbidden: you do not have access" },
        { status: 403 },
      ),
    };
  }

  return {
    user: {
      id: sessionUser.id,
      role,
      name: sessionUser.name,
      email: sessionUser.email,
    },
  };
}
