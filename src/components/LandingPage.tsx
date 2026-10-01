"use client";
import React from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { LogIn, ShoppingBasket, UserPlus } from "lucide-react";

// Public page shown at "/" to visitors who are not logged in.
const LandingPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center gap-3"
      >
        <ShoppingBasket className="w-10 h-10 text-green-600" />
        <h1 className="text-4xl md:text-5xl font-extrabold text-green-700">
          OmniMart
        </h1>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-4 text-2xl md:text-3xl font-bold text-gray-800"
      >
        15 minutes grocery delivery
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-3 text-gray-700 text-lg max-w-lg"
      >
        Fresh fruits, vegetables, and daily essentials delivered right to your
        doorstep.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-10 flex flex-col sm:flex-row gap-4"
      >
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-2xl shadow-md transition-all duration-200"
        >
          <LogIn className="w-5 h-5" />
          Login
        </Link>
        <Link
          href="/register"
          className="inline-flex items-center justify-center gap-2 border-2 border-green-600 text-green-700 hover:bg-green-50 font-semibold py-3 px-8 rounded-2xl shadow-md transition-all duration-200"
        >
          <UserPlus className="w-5 h-5" />
          Register
        </Link>
      </motion.div>
    </div>
  );
};

export default LandingPage;
