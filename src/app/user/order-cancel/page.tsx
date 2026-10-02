"use client";
import React from "react";
import { motion } from "motion/react";
import { XCircle, ArrowRight, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function OrderCancel() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 bg-linear-to-b from-red-50 to-white relative overflow-hidden">
      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: 180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 10, stiffness: 100 }}
        className="relative"
      >
        <XCircle className="text-red-600 w-24 h-24 md:w-28 md:h-28" />

        {/* Pulse Glow */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: [0.3, 0, 0.3], scale: [1, 0.6, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-full h-full rounded-full bg-red-500 blur-2xl" />
        </motion.div>
      </motion.div>

      {/* Heading */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl md:text-4xl font-bold text-red-600 mt-6"
      >
        Payment Cancelled
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-gray-600 mt-3 text-sm md:text-base max-w-md text-center"
      >
        Your payment was not completed. Don’t worry — no charges were made. Your
        cart is still saved, so you can try again or continue shopping.
      </motion.p>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: [0, -10, 0], opacity: 1 }}
        transition={{
          delay: 1,
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="mt-10"
      >
        <RefreshCcw className="w-16 h-16 md:w-20 md:h-20 text-red-500" />
      </motion.div>
      {/* Actions */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        {/* Continue Shopping */}
        <motion.button
          onClick={() => router.push("/")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-6 py-3 cursor-pointer rounded-full text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
        >
          Continue Shopping
        </motion.button>

        {/* Retry Payment */}
        <Link href="/user/checkout">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            className="flex items-center gap-2 bg-linear-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold px-8 py-3 rounded-full shadow-lg shadow-red-200"
          >
            Back to Checkout <RefreshCcw className="w-4 h-4" />
          </motion.div>
        </Link>
      </motion.div>

      {/* Floating particles */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      >
        <div className="absolute top-20 left-[10%] w-2 h-2 bg-red-400 rounded-full animate-bounce" />
        <div className="absolute top-32 left-[30%] w-2 h-2 bg-red-400 animate-pulse" />
        <div className="absolute top-24 left-[50%] w-2 h-2 bg-red-400 animate-bounce" />
        <div className="absolute top-16 left-[70%] w-2 h-2 bg-red-400 animate-pulse" />
      </motion.div>
    </div>
  );
}

export default OrderCancel;
