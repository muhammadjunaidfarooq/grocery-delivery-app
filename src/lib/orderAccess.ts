import type { AuthUser } from "@/lib/requireAuth";

type IdLike = { toString(): string };

interface OrderOwnership {
  user?: IdLike | { _id: IdLike } | null;
  // May be a plain id or a populated user document
  assignedDeliveryBoy?: IdLike | { _id: IdLike } | null;
}

const toId = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: IdLike })._id);
  }
  return String(value);
};

/**
 * An order (and its chat room) can only be used by:
 *  - the customer who placed it
 *  - the delivery rider who accepted it
 *  - an admin
 */
export function canAccessOrder(order: OrderOwnership, user: AuthUser): boolean {
  if (user.role === "admin") return true;
  if (toId(order.user) === user.id) return true;
  if (toId(order.assignedDeliveryBoy) === user.id) return true;
  return false;
}
