"use client";
import React, { ChangeEvent, useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Loader2, Upload } from "lucide-react";
import { GROCERY_CATEGORIES, GROCERY_UNITS } from "@/lib/groceryOptions";

export interface IGroceryRow {
  _id: string;
  name: string;
  category: string;
  price: string;
  unit: string;
  image: string;
  inStock: boolean;
}

interface Iprops {
  grocery: IGroceryRow;
  onClose: () => void;
  onSaved: (updated: IGroceryRow) => void;
}

const inputClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none";

// Edit form for one product. The image is optional: leave it empty to keep
// the current one.
const EditGroceryModal = ({ grocery, onClose, onSaved }: Iprops) => {
  const [name, setName] = useState(grocery.name);
  const [category, setCategory] = useState(grocery.category);
  const [price, setPrice] = useState(grocery.price);
  const [unit, setUnit] = useState(grocery.unit);
  const [newImage, setNewImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("category", category);
      formData.append("price", price);
      formData.append("unit", unit);
      if (newImage) formData.append("image", newImage);

      const result = await axios.patch<IGroceryRow>(
        `/api/admin/groceries/${grocery._id}`,
        formData,
      );
      onSaved(result.data);
    } catch (err) {
      console.log(err);
      setError(
        (axios.isAxiosError(err) && err.response?.data?.message) ||
          "Could not save the product. Try again.",
      );
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={() => !saving && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-title"
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 my-auto"
      >
        <h2 id="edit-title" className="text-xl font-bold text-green-700">
          Edit product
        </h2>

        <div>
          <label htmlFor="g-name" className="block text-sm text-gray-600 mb-1">
            Name
          </label>
          <input
            id="g-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="g-cat" className="block text-sm text-gray-600 mb-1">
              Category
            </label>
            <select
              id="g-cat"
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {GROCERY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="g-unit" className="block text-sm text-gray-600 mb-1">
              Unit
            </label>
            <select
              id="g-unit"
              className={inputClass}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              {GROCERY_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="g-price" className="block text-sm text-gray-600 mb-1">
            Price (Rs.)
          </label>
          <input
            id="g-price"
            className={inputClass}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>

        <div>
          <p className="block text-sm text-gray-600 mb-1">
            Image <span className="text-gray-400">(optional)</span>
          </p>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 rounded-lg bg-gray-50 border overflow-hidden shrink-0">
              <Image
                src={preview ?? grocery.image}
                alt={name}
                fill
                sizes="80px"
                className="object-contain p-1"
                unoptimized={!!preview}
              />
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
              <Upload className="w-4 h-4" />
              {newImage ? "Change image" : "Choose new image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImage}
              />
            </label>
          </div>
          {newImage && (
            <p className="text-xs text-gray-500 mt-1">
              The new image replaces the old one when you save.
            </p>
          )}
        </div>

        {error && (
          <p role="alert" className="text-red-600 text-sm">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
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
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium inline-flex items-center gap-2 disabled:opacity-60"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditGroceryModal;
