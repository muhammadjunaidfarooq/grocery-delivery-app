"use client";
import axios from "axios";
import { ArrowRight, Bike, User, UserCog } from "lucide-react";
import { motion } from "motion/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cleanMobile, isValidMobile, MOBILE_PREFIX } from "@/lib/mobile";

const EditRoleMobile = () => {
  const [roles, setRoles] = useState([
    { id: "admin", label: "Admin", icon: UserCog },
    { id: "user", label: "User", icon: User },
    { id: "deliveryBoy", label: "DeliveryBoy", icon: Bike },
  ]);
  const [selectedRole, setSelectedRole] = useState("");
  const [mobile, setMobile] = useState("");
  const router = useRouter();
  const { update } = useSession();

  const handleEdit = async () => {
    try {
      const result = await axios.post("/api/user/edit-role-mobile", {
        role: selectedRole,
        mobile, // the 10 digits after +92; the server adds the prefix
      });
      // Passing an object makes this a POST, which makes the server re-read the
      // role from the database. The server ignores what we send, so the role
      // cannot be chosen from the browser.
      await update({});
      // We are already on "/", so refresh to re-render it with the new role
      router.refresh();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const checkForAdmin = async () => {
      try {
        const result = await axios.get("/api/check-for-admin");
        console.log(result.data);
        if (result.data.adminExist) {
          setRoles((prev) => prev.filter((r) => r.id !== "admin"));
        }
      } catch (error) {
        console.log(error);
      }
    };

    checkForAdmin();
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen p-6 w-full">
      <motion.h1
        initial={{
          opacity: 0,
          y: -15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.6,
        }}
        className="text-3xl md:tex-4xl font-extrabold text-green-700 text-center mt-8"
      >
        {" "}
        Select Your Role
      </motion.h1>
      <div className="flex flex-col md:flex-row justify-center items-center gap-6 mt-10">
        {roles.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole == role.id;
          return (
            <motion.div
              key={role.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedRole(role.id)}
              className={`flex flex-col items-center justify-center w-48 h-44 rounded-2xl border-2 transition-all ${
                isSelected
                  ? "border-green-600 bg-green-100 shadow-lg"
                  : "border-gray-300 bg-white hover:border-green-400"
              } cursor-pointer`}
            >
              <Icon />
              <span>{role.label}</span>
            </motion.div>
          );
        })}
      </div>
      <motion.div
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.6,
          delay: 0.5,
        }}
        className="flex flex-col items-center mt-10"
      >
        <label htmlFor="mobile" className="text-gray-700 font-medium mb-2">
          Enter Your Mobile No.
        </label>
        <div className="flex w-64 md:w-80 rounded-xl border border-gray-300 focus-within:ring-2 focus-within:ring-green-500 overflow-hidden">
          <span className="flex items-center px-4 bg-gray-100 text-gray-700 font-medium border-r border-gray-300">
            {MOBILE_PREFIX}
          </span>
          <input
            type="tel"
            id="mobile"
            inputMode="numeric"
            className="flex-1 min-w-0 px-4 py-3 focus:outline-none text-gray-800"
            placeholder="3001234567"
            value={mobile}
            onChange={(e) => setMobile(cleanMobile(e.target.value).slice(0, 10))}
          />
        </div>
        {mobile.length > 0 && !isValidMobile(mobile) && (
          <p className="text-red-600 text-sm mt-2">
            Enter 10 digits starting with 3 (for example 3001234567)
          </p>
        )}
      </motion.div>
      <motion.button
        initial={{
          opacity: 0,
          y: 15,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 0.7,
        }}
        disabled={!isValidMobile(mobile) || !selectedRole}
        className={`inline-flex items-center gap-2 font-semibold py-3 px-8 rounded-2xl shadow-md transition-all duration-200 w-50 mt-20 ${
          selectedRole && isValidMobile(mobile)
            ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
        onClick={handleEdit}
      >
        Go to Home
        <ArrowRight />
      </motion.button>
    </div>
  );
};

export default EditRoleMobile;
