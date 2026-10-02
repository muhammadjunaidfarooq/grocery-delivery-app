// Payment confirmation for orders.
//
// isPaid (existing field) is the payment status: false = PENDING, true = PAID.
// A Cash on Delivery order starts unpaid and becomes paid only when
//  - the assigned rider confirms cash (method "cash", role "deliveryBoy"), or
//  - an admin confirms a direct payment, with a required note (role "admin").
// Stripe orders are marked paid by the Stripe webhook (method "stripe").

export const ADMIN_PAYMENT_METHODS = [
  "cash",
  "easypaisa",
  "jazzcash",
  "bank_transfer",
  "other",
] as const;

export const PAYMENT_CONFIRMATION_METHODS = [...ADMIN_PAYMENT_METHODS, "stripe"] as const;

export type AdminPaymentMethod = (typeof ADMIN_PAYMENT_METHODS)[number];
export type PaymentConfirmationMethod = (typeof PAYMENT_CONFIRMATION_METHODS)[number];
export type PaymentReceivedByRole = "deliveryBoy" | "admin";

export const PAYMENT_METHOD_LABELS: Record<PaymentConfirmationMethod, string> = {
  cash: "Cash",
  easypaisa: "Easypaisa",
  jazzcash: "JazzCash",
  bank_transfer: "Bank Transfer",
  other: "Other",
  stripe: "Card (Stripe)",
};

export const ROLE_LABELS: Record<PaymentReceivedByRole, string> = {
  deliveryBoy: "Delivery Boy",
  admin: "Admin",
};

export const MAX_PAYMENT_NOTE_LENGTH = 500;

/** Fields the browser gets about payment (no internal admin note). */
export interface OrderPaymentInfo {
  paymentMethod: "cod" | "online";
  isPaid: boolean;
  paidAt?: string | Date | null;
  paymentConfirmationMethod?: PaymentConfirmationMethod | null;
  paymentReceivedByRole?: PaymentReceivedByRole | null;
}

/**
 * Customer-friendly text for "Payment Method". A COD order that the admin
 * confirmed as a direct transfer shows "Paid directly" (no internal details).
 */
export function customerPaymentMethodLabel(order: OrderPaymentInfo): string {
  if (order.paymentMethod === "online") return "Online Payment (Card)";
  if (
    order.isPaid &&
    order.paymentReceivedByRole === "admin" &&
    order.paymentConfirmationMethod !== "cash"
  ) {
    return "Paid directly";
  }
  return "Cash on Delivery";
}

export const formatMoney = (amount: number) =>
  `Rs.${Number(amount || 0).toLocaleString("en-PK", { maximumFractionDigits: 2 })}`;

export const formatPaidAt = (value?: string | Date | null) =>
  value
    ? new Date(value).toLocaleString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
