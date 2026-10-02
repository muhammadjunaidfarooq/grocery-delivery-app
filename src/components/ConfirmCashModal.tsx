"use client";
import React, { useEffect } from "react";
import { Banknote, Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/payment";

interface Iprops {
  amount: number;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// Confirmation shown before the rider records that cash was received.
// Same layout as ConfirmDeleteModal.
const ConfirmCashModal = ({ amount, saving, error, onCancel, onConfirm }: Iprops) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onCancel]);

  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !saving && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-green-100 p-2 rounded-full">
            <Banknote className="w-5 h-5 text-green-700" />
          </div>
          <h2 id="cash-title" className="text-lg font-bold text-gray-800">
            Confirm Cash Received
          </h2>
        </div>
        <p className="text-gray-600 text-sm">
          Have you received the full order amount of{" "}
          <span className="font-semibold text-gray-800">{formatMoney(amount)}</span>{" "}
          in cash from the customer?
        </p>

        {error && (
          <p role="alert" className="text-red-600 text-sm mt-3">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium inline-flex items-center gap-2 disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmCashModal;
