"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Boxes,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
} from "lucide-react";
import { GROCERY_CATEGORIES } from "@/lib/groceryOptions";
import EditGroceryModal, { IGroceryRow } from "@/components/EditGroceryModal";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";

const messageFrom = (err: unknown, fallback: string) =>
  (axios.isAxiosError(err) && err.response?.data?.message) || fallback;

function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-24 bg-gray-200 rounded" />
        <div className="h-4 w-36 bg-gray-200 rounded" />
        <div className="h-8 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

const AdminGroceries = () => {
  const router = useRouter();
  const [items, setItems] = useState<IGroceryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const [editing, setEditing] = useState<IGroceryRow | null>(null);
  const [deleting, setDeleting] = useState<IGroceryRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // Search and category filter are applied by the server
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(
      () => {
        axios
          .get<IGroceryRow[]>("/api/admin/groceries", {
            params: {
              search: search.trim() || undefined,
              category: category === "all" ? undefined : category,
            },
          })
          .then((result) => {
            if (cancelled) return;
            setItems(result.data);
            setError("");
            setLoading(false);
          })
          .catch((err) => {
            if (cancelled) return;
            console.log(err);
            setError("Could not load the products. Please try again.");
            setLoading(false);
          });
      },
      search ? 300 : 0,
    );
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, category, reloadCount]);

  const toggleStock = async (item: IGroceryRow) => {
    setBusyId(item._id);
    setActionError("");
    try {
      const formData = new FormData();
      formData.append("inStock", String(!item.inStock));
      const result = await axios.patch<IGroceryRow>(
        `/api/admin/groceries/${item._id}`,
        formData,
      );
      setItems((prev) =>
        prev ? prev.map((g) => (g._id === item._id ? result.data : g)) : prev,
      );
    } catch (err) {
      console.log(err);
      setActionError(messageFrom(err, "Could not update stock. Try again."));
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await axios.delete(`/api/admin/groceries/${deleting._id}`);
      setItems((prev) => prev?.filter((g) => g._id !== deleting._id) ?? prev);
      setDeleting(null);
    } catch (err) {
      console.log(err);
      setDeleteError(messageFrom(err, "Could not delete the product."));
    } finally {
      setDeleteBusy(false);
    }
  };

  const hasFilter = search.trim() !== "" || category !== "all";

  return (
    <div className="bg-linear-to-b from-white to-gray-100 min-h-screen w-full">
      <div className="fixed top-0 left-0 w-full backdrop-blur-lg bg-white/70 shadow-sm border-b z-50">
        <div className="max-w-5xl mx-auto flex items-center gap-4 px-4 py-3">
          <button
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 active:scale-95 transition"
            onClick={() => router.push("/")}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={24} className="text-green-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800 flex-1">
            Manage Groceries
          </h1>
          <Link
            href="/admin/add-grocery"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-full"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Add grocery</span>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-10">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="search"
              placeholder="Search by name..."
              aria-label="Search products"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLoading(true);
              }}
              className="w-full border border-gray-300 rounded-xl py-2.5 pl-10 pr-4 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>
          <select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setLoading(true);
            }}
            className="border border-gray-300 rounded-xl px-4 py-2.5 bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
          >
            <option value="all">All categories</option>
            {GROCERY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <span>{error}</span>
            <button
              onClick={() => {
                setError("");
                setLoading(true);
                setReloadCount((c) => c + 1);
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        )}
        {actionError && (
          <p role="alert" className="text-red-600 text-sm mb-4">
            {actionError}
          </p>
        )}

        {loading && !items ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items && items.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">
            <Boxes className="mx-auto w-10 h-10 text-gray-300 mb-2" />
            {hasFilter
              ? "No products match your search."
              : "No products yet. Add your first grocery."}
          </div>
        ) : (
          items && (
            <>
              <p className="text-sm text-gray-500 mb-3">
                {items.length} product{items.length === 1 ? "" : "s"}
              </p>
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 transition-opacity ${
                  loading ? "opacity-60" : ""
                }`}
              >
                {items.map((item, i) => (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.03 }}
                    className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                  >
                    <div className="relative h-40 bg-gray-50">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className={`object-contain p-4 ${
                          item.inStock ? "" : "opacity-50 grayscale"
                        }`}
                      />
                      {!item.inStock && (
                        <span className="absolute top-3 left-3 bg-gray-800 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                          Out of stock
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <p className="text-xs text-gray-500">{item.category}</p>
                      <h2 className="font-semibold text-gray-800 truncate">
                        {item.name}
                      </h2>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-green-700 font-bold">
                          Rs.{item.price}
                        </span>
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                          {item.unit}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.inStock}
                            aria-label={`${item.name} in stock`}
                            disabled={busyId === item._id}
                            onClick={() => toggleStock(item)}
                            className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-60 ${
                              item.inStock ? "bg-green-600" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                item.inStock ? "translate-x-5" : ""
                              }`}
                            />
                          </button>
                          {item.inStock ? "In stock" : "Out of stock"}
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditing(item)}
                            aria-label={`Edit ${item.name}`}
                            className="p-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError("");
                              setDeleting(item);
                            }}
                            aria-label={`Delete ${item.name}`}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )
        )}
      </div>

      {editing && (
        <EditGroceryModal
          grocery={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((prev) =>
              prev
                ? prev.map((g) => (g._id === updated._id ? updated : g))
                : prev,
            );
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <ConfirmDeleteModal
          name={deleting.name}
          deleting={deleteBusy}
          error={deleteError}
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default AdminGroceries;
