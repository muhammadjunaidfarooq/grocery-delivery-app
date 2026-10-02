"use client";
import { AppDispatch } from "@/redux/store";
import { setUserData } from "@/redux/userSlice";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

// Loads the logged-in user's profile into Redux (and clears it on logout)
const useGetMe = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { status, data } = useSession();
  const role = data?.user?.role;
  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      dispatch(setUserData(null));
      return;
    }
    const getMe = async () => {
      try {
        const result = await axios.get("/api/me");
        dispatch(setUserData(result.data));
      } catch (error) {
        console.error("Could not load profile", error);
      }
    };
    getMe();
    // role changes after onboarding, so the profile is loaded again
  }, [status, role, dispatch]);
};

export default useGetMe;
