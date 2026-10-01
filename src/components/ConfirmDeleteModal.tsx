"use client";
import React, { useEffect } from "react";
import { Loader2, Trash2 } from "lucide-react";

interface Iprops {
  name: string;
  deleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// Confirmation dialog shown before a product is deleted
const ConfirmDeleteModal = ({
  name,
  deleting,
  error,
  onCancel,
  onConfirm,
}: Iprops) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleting, onCancel]);

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
      onClick={() => !deleting && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-red-100 p-2 rounded-full">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <h2 id="delete-title" className="text-lg font-bold text-gray-800">
            Delete this product?
          </h2>
        </div>
        <p className="text-gray-600 text-sm">
          <span className="font-semibold">{name}</span> will be removed from the
          shop. Past orders keep their own copy of the name, price and image,
          so they are not affected.
        </p>

        {error && (
          <p role="alert" className="text-red-600 text-sm mt-3">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium inline-flex items-center gap-2 disabled:opacity-60"
          >
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
