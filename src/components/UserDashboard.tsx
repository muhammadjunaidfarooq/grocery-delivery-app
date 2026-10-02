import React from "react";
import Link from "next/link";
import { SearchX } from "lucide-react";
import HeroSection from "./HeroSection";
import CategorySlider from "./CategorySlider";
import connectDb from "@/lib/mongodb";
import Grocery from "@/models/grocery.model";
import GroceryItemCard, { type GroceryCardItem } from "./GroceryItemCard";
import { GROCERY_CATEGORIES } from "@/lib/groceryOptions";

const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Server component: products are read from MongoDB while the page renders.
// ?q= searches by name, ?category= filters by category (both from the URL).
const UserDashboard = async ({
  search,
  category,
}: {
  search?: string;
  category?: string;
}) => {
  const q = (search ?? "").trim().slice(0, 100);
  const activeCategory = (GROCERY_CATEGORIES as readonly string[]).includes(
    category ?? "",
  )
    ? category
    : undefined;

  const filter: Record<string, unknown> = {};
  if (q) filter.name = { $regex: escapeRegex(q), $options: "i" };
  if (activeCategory) filter.category = activeCategory;

  await connectDb();
  const groceries = await Grocery.find(filter).sort({ createdAt: -1 }).lean();
  const plainGrocery = JSON.parse(JSON.stringify(groceries));
  const filtered = Boolean(q || activeCategory);

  return (
    <>
      <HeroSection />
      <CategorySlider active={activeCategory} />
      <div id="products" className="w-[90%] md:w-[80%] mx-auto mt-10 mb-16 scroll-mt-28">
        <h2 className="text-2xl md:text-3xl font-bold text-green-700 mb-2 text-center">
          {filtered ? activeCategory ?? "Search results" : "Popular Grocery Items"}
        </h2>
        {filtered && (
          <p className="text-center text-gray-600 mb-6">
            {q && (
              <>
                Showing results for <b>&ldquo;{q}&rdquo;</b>
                {activeCategory ? " in this category" : ""}.{" "}
              </>
            )}
            <Link href="/#products" className="text-green-700 font-medium underline">
              Clear filters
            </Link>
          </p>
        )}
        {plainGrocery.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-dashed border-gray-300 p-10 text-center text-gray-500 mt-6">
            <SearchX className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            {filtered
              ? "No products match your search."
              : "No products yet. The admin can add products from the dashboard."}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-6 mt-6">
            {plainGrocery.map((item: GroceryCardItem) => (
              <GroceryItemCard key={item._id} item={item} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default UserDashboard;
