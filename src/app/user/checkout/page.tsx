"use client";
import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Building,
  MapPin,
  Phone,
  User,
  Home,
  Navigation,
  Search,
  Loader2,
  LocateFixed,
  CreditCard,
  CreditCardIcon,
  Truck,
  ShoppingBasket,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/redux/store";
import { clearCart } from "@/redux/cartSlice";
import axios from "axios";

// Leaflet needs `window`, so the map is loaded in the browser only
const CheckoutMap = dynamic(() => import("@/components/CheckoutMap"), {
  ssr: false,
});

// Used when the browser cannot give us a location (blocked or unavailable):
// the map still shows, and the customer can search or drag the pin.
const DEFAULT_POSITION: [number, number] = [31.5204, 74.3587]; // Lahore

const Checkout = () => {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { userData } = useSelector((state: RootState) => state.user);
  const { subTotal, deliveryFee, finalTotal, cartData } = useSelector(
    (state: RootState) => state.cart,
  );
  const [address, setAddress] = useState({
    fullName: "",
    mobile: "",
    city: "",
    state: "",
    pincode: "",
    fullAddress: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [placing, setPlacing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [locationNote, setLocationNote] = useState("");

  const [position, setPosition] = useState<[number, number] | null>(null);

  const locate = () => {
    if (!navigator.geolocation) {
      setPosition((prev) => prev ?? DEFAULT_POSITION);
      setLocationNote("Location is not available. Search your area or drag the pin.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationNote("");
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        setPosition((prev) => prev ?? DEFAULT_POSITION);
        setLocationNote("Location access was blocked. Search your area or drag the pin.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  };

  useEffect(() => {
    locate();
  }, []);

  useEffect(() => {
    if (userData) {
      setAddress((prev) => ({
        ...prev,
        fullName: prev.fullName || userData.name || "",
        mobile: prev.mobile || userData.mobile || "",
      }));
    }
  }, [userData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setErrorMessage("");
    setAddress((prev) => ({
      ...prev,
      [name]: value, // This updates the specific field based on the 'name' attribute
    }));
  };

  const handleSearchQuery = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      // leaflet-geosearch pulls in Leaflet (needs `window`), so load it on demand
      const { OpenStreetMapProvider } = await import("leaflet-geosearch");
      const provider = new OpenStreetMapProvider();
      const results = await provider.search({ query: searchQuery });
      if (results && results.length > 0) {
        setLocationNote("");
        setPosition([results[0].y, results[0].x]);
      } else {
        setLocationNote("No place found for that search.");
      }
    } catch (error) {
      console.error(error);
      setLocationNote("Search is not available right now. Drag the pin instead.");
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const fetchAddress = async () => {
      if (!position) return;
      try {
        const result = await axios.get(
          `https://nominatim.openstreetmap.org/reverse?lat=${position[0]}&lon=${position[1]}&format=json`,
        );
        setAddress((prev) => ({
          ...prev,
          city:
            result.data.address.city ||
            result.data.address.town ||
            result.data.address.village ||
            prev.city,
          state: result.data.address.state || prev.state,
          pincode: result.data.address?.postcode || prev.pincode,
          fullAddress: result.data.display_name || prev.fullAddress,
        }));
      } catch (error) {
        // Reverse geocoding is a convenience; the customer can type the address
        console.error("Reverse geocoding failed", error);
      }
    };
    fetchAddress();
  }, [position]);

  // Same checks the server does, so the customer sees the problem at once
  const validate = () => {
    if (cartData.length === 0) return "Your cart is empty";
    if (!address.fullName.trim()) return "Please enter your full name";
    const digits = address.mobile.replace(/\D/g, "").replace(/^(92|0)/, "");
    if (!/^3\d{9}$/.test(digits)) return "Please enter a valid mobile number (e.g. 3001234567)";
    if (!address.fullAddress.trim()) return "Please enter your delivery address";
    if (!address.city.trim()) return "Please enter your city";
    if (!position) return "Please choose your location on the map";
    return "";
  };

  const placeOrder = async () => {
    const problem = validate();
    if (problem) {
      setErrorMessage(problem);
      return;
    }
    setPlacing(true);
    setErrorMessage("");
    // Only ids and quantities are sent: the server looks up the prices
    const body = {
      items: cartData.map((item) => ({ grocery: item._id, quantity: item.quantity })),
      address: { ...address, latitude: position![0], longitude: position![1] },
    };
    try {
      if (paymentMethod === "cod") {
        await axios.post("/api/user/order", body);
        dispatch(clearCart());
        router.push("/user/order-success");
      } else {
        const result = await axios.post("/api/user/payment", body);
        // The cart is cleared on the success page, after Stripe returns
        window.location.href = result.data.url;
      }
    } catch (error) {
      console.error(error);
      setErrorMessage(
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Could not place your order. Please check your connection and try again.",
      );
      setPlacing(false);
    }
  };

  if (cartData.length === 0 && !placing) {
    return (
      <div className="w-[92%] md:w-[80%] mx-auto py-24 text-center">
        <ShoppingBasket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 text-lg mb-6">Your cart is empty.</p>
        <button
          onClick={() => router.push("/")}
          className="bg-green-600 text-white px-6 py-3 rounded-full hover:bg-green-700 transition-all font-medium"
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="w-[92%] md:w-[80%] mx-auto py-10 relative">
      <motion.button
        whileTap={{ scale: 0.97 }}
        className="absolute left-0 top-2 flex items-center gap-2 text-green-700 hover:text-green-800 font-semibold"
        onClick={() => router.push("/user/cart")}
      >
        <ArrowLeft size={16} />
        <span>Back to cart</span>
      </motion.button>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-3xl md:text-4xl font-bold text-green-700 text-center mb-10"
      >
        Checkout
      </motion.h1>

      <div className="grid md:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="text-green-700" /> Delivery Address
          </h2>
          <div className="space-y-4">
            <div className="relative">
              <User
                className="absolute left-3 top-3 text-green-600"
                size={18}
              />
              <input
                type="text"
                value={address.fullName}
                placeholder="Full Name"
                name="fullName"
                onChange={handleChange}
                className="pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50"
              />
            </div>
            <div className="relative">
              <Phone
                className="absolute left-3 top-3 text-green-600"
                size={18}
              />
              <input
                type="text"
                value={address.mobile}
                placeholder="Mobile (e.g. 3001234567)"
                inputMode="tel"
                name="mobile"
                onChange={handleChange}
                className="pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50"
              />
            </div>
            <div className="relative">
              <Home
                className="absolute left-3 top-3 text-green-600"
                size={18}
              />
              <input
                type="text"
                value={address.fullAddress}
                placeholder="Full Address"
                name="fullAddress"
                onChange={handleChange}
                className="pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Building
                  className="absolute left-3 top-3 text-green-600"
                  size={18}
                />
                <input
                  type="text"
                  value={address.city}
                  placeholder="city"
                  name="city"
                  onChange={handleChange}
                  className="pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50"
                />
              </div>
              <div className="relative">
                <Navigation
                  className="absolute left-3 top-3 text-green-600"
                  size={18}
                />
                <input
                  type="text"
                  value={address.state}
                  placeholder="state"
                  name="state"
                  onChange={handleChange}
                  className="pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50"
                />
              </div>
              <div className="relative">
                <Search
                  className="absolute left-3 top-3 text-green-600"
                  size={18}
                />
                <input
                  type="text"
                  value={address.pincode}
                  placeholder="pincode"
                  name="pincode"
                  onChange={handleChange}
                  className="pl-10 w-full border rounded-lg p-3 text-sm bg-gray-50"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                placeholder="search city or area..."
                className="flex-1 border rounded-lg p-3 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchQuery();
                  }
                }}
              />
              <button
                type="button"
                disabled={searchLoading}
                className="bg-green-600 text-white px-5 rounded-lg hover:bg-green-700 transition-all font-medium"
                onClick={handleSearchQuery}
              >
                {searchLoading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  "Search"
                )}
              </button>
            </div>
            {locationNote && (
              <p className="text-amber-700 text-sm">{locationNote}</p>
            )}
            <div className="relative mt-6 h-82.5 rounded-xl overflow-hidden border border-gray-200 shadow-inner">
              {position && (
                <CheckoutMap
                  position={position}
                  onPositionChange={setPosition}
                />
              )}
              <motion.button
                whileTap={{ scale: 0.93 }}
                className="absolute bottom-4 right-4 bg-green-600 text-white shadow-lg rounded-full p-3 hover:bg-green-700 transition-all flex items-center justify-center z-999"
                onClick={locate}
                aria-label="Use my current location"
              >
                <LocateFixed size={22} />
              </motion.button>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 h-fit"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="text-green-600" /> Payment Method
          </h2>

          <div className="space-y-4 mb-6">
            {/* Online Payment Button */}
            <button
              onClick={() => setPaymentMethod("online")}
              className={`flex items-center gap-3 w-full border rounded-lg p-3 transition-all ${
                paymentMethod === "online"
                  ? "border-green-600 bg-green-50 shadow-sm"
                  : "hover:bg-gray-50"
              }`}
            >
              <CreditCardIcon className="text-green-600" />
              <span className="font-medium text-gray-700">
                Pay Online (stripe)
              </span>
            </button>

            {/* Cash on Delivery Button */}
            <button
              onClick={() => setPaymentMethod("cod")}
              className={`flex items-center gap-3 w-full border rounded-lg p-3 transition-all ${
                paymentMethod === "cod"
                  ? "border-green-600 bg-green-50 shadow-sm"
                  : "hover:bg-gray-50"
              }`}
            >
              <Truck className="text-green-600" />
              <span className="font-medium text-gray-700">
                Cash on Delivery
              </span>
            </button>
          </div>
          <div className="border-t pt-4 text-gray-700 space-y-2 text-sm sm:text-base">
            <div className="flex justify-between">
              <span className="font-semibold">Subtotal</span>
              <span className="font-semibold text-green-600">
                Rs.{subTotal}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold">Delivery Fee</span>
              <span className="font-semibold text-green-600">
                Rs.{deliveryFee}
              </span>
            </div>

            <div className="flex justify-between font-bold text-lg border-t pt-3">
              <span>Final Total</span>
              <span className="font-semibold text-green-600">
                Rs.{finalTotal}
              </span>
            </div>
          </div>
          {errorMessage && (
            <p role="alert" className="mt-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
              {errorMessage}
            </p>
          )}
          <motion.button
            whileTap={{ scale: 0.93 }}
            disabled={placing}
            className="w-full mt-6 bg-green-600 text-white py-3 rounded-full hover:bg-green-700 transition-all font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            onClick={placeOrder}
          >
            {placing && <Loader2 className="animate-spin" size={18} />}
            {placing
              ? "Placing order..."
              : paymentMethod === "cod"
                ? "Place Order"
                : "Pay & Place Order"}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default Checkout;
