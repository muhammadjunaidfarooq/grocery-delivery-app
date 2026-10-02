"use client";
import React, { useEffect, useState } from "react";
import { Leaf, Truck, Smartphone, ShoppingBasket } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";

const HeroSection = () => {
  const slides = [
    {
      id: 1,
      icon: (
        <Leaf className="w-20 h-20 sm:w-28 sm:h-28 text-green-400 drop-shadow-lg" />
      ),
      title: "Fresh Organic Groceries 🥦",
      subtitle:
        "Farm-fresh fruits, vegetables, and daily essentials delivered to you.",
      btnText: "Shop Now",
      bg: "https://images.unsplash.com/photo-1767364084218-a18f3ea7e93f?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 2,
      icon: (
        <Truck className="w-20 h-20 sm:w-28 sm:h-28 text-yellow-400 drop-shadow-lg" />
      ),
      title: "Fast & Reliable Delivery 🚚",
      subtitle: "We ensure your groceries reach your doorstep in no time.",
      btnText: "Order Now",
      bg: "https://images.unsplash.com/photo-1648394794449-5dbe63f6a8b5?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 3,
      icon: (
        <Smartphone className="w-20 h-20 sm:w-28 sm:h-28 text-blue-400 drop-shadow-lg" />
      ),
      title: "Shop Anytime, Anywhere 📱",
      subtitle: "Easy and seamless online grocery shopping experience.",
      btnText: "Get Started",
      bg: "https://plus.unsplash.com/premium_photo-1761846736566-acd27ef37be8?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
  ];

  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-[98%] mx-auto mt-32 h-[60vh] sm:h-[70vh] rounded-3xl overflow-hidden shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
        >
          <Image
            src={slides[current].bg}
            fill
            alt="sliding_images"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center justify-center text-center text-white px-6">
        <motion.div
          key={current} // Key is vital for AnimatePresence to trigger animations on slide change
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-center gap-6 max-w-3xl"
        >
          {/* Icon Container */}
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-full shadow-lg">
            {slides[current].icon}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight drop-shadow-lg">
            {slides[current].title}
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-gray-200 max-w-2xl">
            {slides[current].subtitle}
          </p>

          {/* CTA Button */}
          <motion.button
            whileHover={{ scale: 1.09 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={() =>
              document
                .getElementById("products")
                ?.scrollIntoView({ behavior: "smooth" })
            }
            className="mt-4 bg-white text-green-700 hover:bg-green-100      px-8 py-3 rounded-full shadow-lg transition-all duration-300 flex items-center gap-2 font-bold cursor-pointer"
          >
            <ShoppingBasket className="w-5 h-5" />
            {slides[current].btnText}
          </motion.button>
        </motion.div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-50">
        {slides.map((_, index) => (
          <motion.div
            key={index}
            onClick={() => setCurrent(index)} // Allows user to click dots to change slide
            initial={false}
            animate={{
              width: current === index ? 32 : 12, // active dot stretches
              backgroundColor: current === index ? "#4ade80" : "#ffffff", // active dot turns green
              opacity: current === index ? 1 : 0.5,
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="h-3 rounded-full cursor-pointer shadow-md"
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSection;
