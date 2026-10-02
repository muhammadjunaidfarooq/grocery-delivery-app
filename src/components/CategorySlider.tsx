"use client";
import {
  Apple,
  Baby,
  Box,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cookie,
  Flame,
  Heart,
  Home,
  Milk,
  Wheat,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

const CategorySlider = ({ active }: { active?: string }) => {
  const categories = [
    { id: 1, name: "Fruits & Vegetables", icon: Apple, color: "bg-green-100" },
    { id: 2, name: "Dairy & Eggs", icon: Milk, color: "bg-yellow-100" },
    { id: 3, name: "Rice, Atta & Grains", icon: Wheat, color: "bg-orange-100" },
    { id: 4, name: "Snacks & Biscuits", icon: Cookie, color: "bg-pink-100" },
    { id: 5, name: "Spices & Masalas", icon: Flame, color: "bg-red-100" },
    { id: 6, name: "Beverages & Drinks", icon: Coffee, color: "bg-blue-100" },
    { id: 7, name: "Personal Care", icon: Heart, color: "bg-purple-100" },
    { id: 8, name: "Household Essentials", icon: Home, color: "bg-lime-100" },
    { id: 9, name: "Instant & Packaged Food", icon: Box, color: "bg-teal-100" },
    { id: 10, name: "Baby & Pet Care", icon: Baby, color: "bg-rose-100" },
  ];

  const [showLeft, setShowLeft] = useState<boolean>(false);
  const [showRight, setShowRight] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = direction === "left" ? -300 : 300;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 0);
    setShowRight(scrollLeft + clientWidth <= scrollWidth - 5);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!scrollRef.current || isPaused) return;

      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

      if (scrollLeft + clientWidth >= scrollWidth - 5) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
      }
    }, 3000); // Updated from 4000 to 2000

    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    scrollRef.current?.addEventListener("scroll", checkScroll);
    checkScroll();
    return () => scrollRef.current?.removeEventListener("scroll", checkScroll);
  }, []);

  return (
    <motion.div
      className="w-[90%] md:w-[80%] mx-auto mt-10 relative"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: false, amount: 0.5 }}
    >
      <h2 className="text-2xl md:text-3xl font-bold text-green-700 mb-6 text-center">
        🛒 Shop by Category
      </h2>

      <AnimatePresence>
        {showLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg hover:bg-green-100 rounded-full w-10 h-10 flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-6 h-6 text-green-700" />
          </button>
        )}
      </AnimatePresence>

      <div
        className="flex gap-5 overflow-x-auto pb-8 scrollbar-hide scroll-smooth no-scrollbar"
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <motion.div
              key={cat.id}
              whileHover={{ y: -5 }}
              className="min-w-35 md:min-w-45 shrink-0"
            >
              <Link
                href={
                  active === cat.name
                    ? "/#products"
                    : `/?category=${encodeURIComponent(cat.name)}#products`
                }
                aria-pressed={active === cat.name}
                className={`group/card flex flex-col items-center justify-center rounded-3xl ${cat.color} p-6 h-full transition-all duration-300 hover:shadow-lg border-2 cursor-pointer ${
                  active === cat.name
                    ? "border-green-600 shadow-lg"
                    : "border-transparent hover:border-green-200"
                }`}
              >
                <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 group-hover/card:scale-110 transition-transform duration-300">
                  <Icon className="w-8 h-8 text-green-700" />
                </div>
                <p className="text-center text-sm md:text-base font-bold text-gray-800 group-hover/card:text-green-800">
                  {cat.name}
                </p>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full w-10 h-10 flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-6 h-6 text-green-700" />
          </button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CategorySlider;
