"use client";
import {
  ArrowLeft,
  EyeIcon,
  EyeOff,
  Key,
  Leaf,
  Loader2,
  Lock,
  LogIn,
  Mail,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";
import googleImage from "@/assets/google_logo.png";
import axios from "axios";
import React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type propType = {
  previousStep: (s: number) => void;
};

const RegisterForm = ({ previousStep }: propType) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      await axios.post("/api/auth/register", {
        name,
        email,
        password,
      });

      // Sign the new user in straight away (no trip to /login)
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!result || result.error) {
        setErrorMessage(
          "Your account was created, but automatic sign-in failed. Please try again.",
        );
        return;
      }

      // "/" shows the role and mobile form for a user who has not set them yet
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        setErrorMessage(error.response.data?.message || "Registration failed");
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10 bg-white relative">
      <div
        className="absolute top-6 left-6 flex items-center gap-2 text-green-700 hover:text-green-800 transition-colors cursor-pointer"
        onClick={() => previousStep(1)}
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </div>

      <motion.h1
        initial={{
          y: -10,
          opacity: 0,
        }}
        animate={{
          y: 0,
          opacity: 1,
        }}
        transition={{
          duration: 0.6,
        }}
        className="text-4xl font-extrabold text-green-700 mb-2"
      >
        Create Account
      </motion.h1>

      <p className="text-gray-600 mb-8 flex items-center gap-1">
        Join OmniMart today <Leaf className="w-5 h-5 text-green-600" />
      </p>

      <motion.form
        onSubmit={handleRegister}
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.6,
        }}
        className="flex flex-col gap-5 w-full max-w-sm"
      >
        <div className="relative">
          <User className="absolute left-3 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Your Name"
            className="w-full border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-3.5 text-gray-400" />
          <input
            type="email"
            placeholder="Your Email"
            className="w-full border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-3.5 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Your Password"
            className="w-full border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
          {showPassword ? (
            <EyeOff
              className="absolute right-3 top-3.5 w-5 h-5 text-gray-500 cursor-pointer"
              onClick={() => setShowPassword(false)}
            />
          ) : (
            <EyeIcon
              className="absolute right-3 top-3.5 w-5 h-5 text-gray-500 cursor-pointer"
              onClick={() => setShowPassword(true)}
            />
          )}
        </div>

        {errorMessage && (
          <p role="alert" className="text-red-600 text-sm text-center -mt-2">
            {errorMessage}
          </p>
        )}

        {(() => {
          const isFormValid =
            name.trim() !== "" && email.includes("@") && password.length;
          return (
            <button
              type="submit" // Explicitly define as submit
              disabled={!isFormValid || loading} // Disable if invalid OR if currently loading
              className={`w-full font-semibold py-3 rounded-xl transition-all duration-200 shadow-md inline-flex items-center justify-center gap-2 
        ${
          isFormValid
            ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Register"
              )}
            </button>
          );
        })()}

        <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
          <span className="flex-1 h-px bg-gray-200"></span>
          OR
          <span className="flex-1 h-px bg-gray-200"></span>
        </div>

        <div
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:bg-gray-50 py-3 rounded-xl text-gray-700 font-medium transition-all duration-200 cursor-pointer"
        >
          <Image src={googleImage} width={20} height={20} alt="google logo" />
          Continue with Google
        </div>
      </motion.form>

      <p
        className="text-gray-600 mt-6 text-sm flex items-center gap-1"
        onClick={() => router.push("/login")}
      >
        Already have an account ? <LogIn className="w-4 h-4" />{" "}
        <span className="text-green-600 cursor-pointer">Sign in</span>{" "}
      </p>
    </div>
  );
};

export default RegisterForm;
