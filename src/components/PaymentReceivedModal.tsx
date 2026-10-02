"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, Wallet } from "lucide-react";
import {
  ADMIN_PAYMENT_METHODS,
  MAX_PAYMENT_NOTE_LENGTH,
  PAYMENT_METHOD_LABELS,
  formatMoney,
  type AdminPaymentMethod,
} from "@/lib/payment";

interface Iprops {
  orderId: string;
  amount: number;
  onClose: () => void;
  onConfirmed: (payment: Record<string, unknown>) => void;
}

// Admin: record that a COD order was paid another way (or in cash).
// The reason is required; the server checks everything again.
const PaymentReceivedModal = ({ orderId, amount, onClose, onConfirmed }: Iprops) => {
  const [method, setMethod] = useState<AdminPaymentMethod | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  const canSubmit = Boolean(method) && note.trim().length > 0 && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method) return setError("Please choose a payment method.");
    if (!note.trim()) return setError("Please enter a reason.");
    setSaving(true);
    setError("");
    try {
      const result = await axios.post(`/api/admin/confirm-payment/${orderId}`, {
        method,
        note: note.trim(),
      });
      onConfirmed(result.data);
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Could not confirm the payment. Please try again.",
      );
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !saving && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-title"
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-green-100 p-2 rounded-full">
            <Wallet className="w-5 h-5 text-green-700" />
          </div>
          <h2 id="payment-title" className="text-lg font-bold text-gray-800">
            Payment Received
          </h2>
        </div>
        <p className="text-gray-500 text-sm mb-4">
          Order total: <span className="font-semibold text-gray-800">{formatMoney(amount)}</span>
        </p>

        <fieldset>
          <legend className="block text-gray-700 font-medium mb-2">Payment Method</legend>
          <div className="grid grid-cols-2 gap-2">
            {ADMIN_PAYMENT_METHODS.map((m) => (
              <label
                key={m}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer transition-all ${
                  method === m
                    ? "border-green-600 bg-green-50 shadow-sm"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value={m}
                  checked={method === m}
                  onChange={() => {
                    setMethod(m);
                    setError("");
                  }}
                  className="accent-green-600"
                />
                {PAYMENT_METHOD_LABELS[m]}
              </label>
            ))}
          </div>
        </fieldset>

        <label htmlFor="payment-note" className="block text-gray-700 font-medium mt-4 mb-1">
          Reason / Explanation <span className="text-red-500">*</span>
        </label>
        <textarea
          id="payment-note"
          value={note}
          maxLength={MAX_PAYMENT_NOTE_LENGTH}
          rows={3}
          onChange={(e) => {
            setNote(e.target.value);
            setError("");
          }}
          placeholder="e.g. Customer transferred the COD amount directly to the business Easypaisa account."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
        <p className="text-xs text-gray-400 text-right">
          {note.length}/{MAX_PAYMENT_NOTE_LENGTH} · internal, not shown to the customer
        </p>

        {error && (
          <p role="alert" className="text-red-600 text-sm mt-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Payment
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentReceivedModal;
