"use client";
import { getSocket } from "@/lib/socket";
import { IDeliveryAssignment } from "@/models/deliveryAssignment.model";
import { RootState } from "@/redux/store";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import dynamic from "next/dynamic";

// Leaflet needs `window`, so the map is loaded in the browser only
const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-125 rounded-xl bg-gray-100 animate-pulse" />
  ),
});
import DeliveryChat from "./DeliveryChat";
import ConfirmCashModal from "./ConfirmCashModal";
import { Banknote, CheckCircle, CreditCard } from "lucide-react";
import { PAYMENT_METHOD_LABELS, ROLE_LABELS, formatMoney, formatPaidAt } from "@/lib/payment";

interface ILocation {
  latitude: number;
  longitude: number;
}

const DeliveryBoysDashboard = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [actionError, setActionError] = useState("");
  const [delivering, setDelivering] = useState(false);

  const { userData } = useSelector((state: RootState) => state.user);

  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<ILocation>({
    latitude: 0,
    longitude: 0,
  });
  // null until the browser gives us the rider's position
  const [deliveryBoyLocation, setDeliveryBoyLocation] =
    useState<ILocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [cashModalOpen, setCashModalOpen] = useState(false);
  const [cashSaving, setCashSaving] = useState(false);
  const [cashError, setCashError] = useState("");

  const fetchAssignments = async () => {
    try {
      const result = await axios.get("/api/delivery/get-assignments");
      setAssignments(result.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect((): any => {
    const socket = getSocket();
    socket.on("new-assignment", (deliveryAssignment) => {
      setAssignments((prev) =>
        prev.some((a) => a._id === deliveryAssignment._id)
          ? prev
          : [...prev, deliveryAssignment],
      );
    });
    return () => socket.off("new-assignment");
  }, []);

  const handleAccept = async (id: string) => {
    setActionError("");
    try {
      await axios.post(`/api/delivery/assignment/${id}/accept-assignment`);
      // Show the active delivery straight away (no page reload needed)
      await fetchCurrentOrder();
    } catch (error) {
      console.log(error);
      setActionError(
        axios.isAxiosError(error) && error.response?.status === 409
          ? "This job was already taken or you have an active delivery."
          : "Could not accept the job. Try again.",
      );
      // The job may have been taken by another rider, so refresh the list
      await fetchAssignments();
    }
  };

  const handleReject = async (id: string) => {
    setActionError("");
    try {
      await axios.post(`/api/delivery/assignment/${id}/reject-assignment`);
      // Remove it from this rider's list; other riders still see it
      setAssignments((prev) => prev.filter((a) => a._id !== id));
    } catch (error) {
      console.log(error);
      setActionError("Could not reject the job. Try again.");
      await fetchAssignments();
    }
  };

  const handleDelivered = async () => {
    if (!activeOrder) return;
    setActionError("");
    setDelivering(true);
    try {
      // activeOrder is the assignment, so activeOrder._id is the assignment id
      await axios.post(
        `/api/delivery/assignment/${activeOrder._id}/mark-delivered`,
      );
      // The rider is free again: back to the list of new jobs
      setActiveOrder(null);
      await fetchAssignments();
    } catch (error) {
      console.log(error);
      setActionError("Could not mark as delivered. Try again.");
    } finally {
      setDelivering(false);
    }
  };

  // Rider confirms the COD cash. The server decides everything (amount,
  // method, time); the browser only says "this job".
  const handleCashReceived = async () => {
    if (!activeOrder) return;
    setCashSaving(true);
    setCashError("");
    try {
      const result = await axios.post(
        `/api/delivery/assignment/${activeOrder._id}/cash-received`,
      );
      setActiveOrder((prev: any) =>
        prev ? { ...prev, order: { ...prev.order, ...result.data } } : prev,
      );
      setCashModalOpen(false);
    } catch (error) {
      console.error(error);
      const message =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Could not confirm the payment. Check your connection and try again.";
      setCashError(message);
      // Paid already (for example by the admin): close and show the new state
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        await fetchCurrentOrder();
      }
    } finally {
      setCashSaving(false);
    }
  };

  const fetchCurrentOrder = async () => {
    try {
      const result = await axios.get("/api/delivery/current-order");

      if (result.data.active) {
        setActiveOrder(result.data.assignment);
        setUserLocation({
          latitude: result.data.assignment.order.address.latitude,
          longitude: result.data.assignment.order.address.longitude,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const socket = getSocket();
    if (!userData?._id) return;
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setDeliveryBoyLocation({
          latitude: lat,
          longitude: lon,
        });
        socket.emit("update-location", {
          userId: userData?._id,
          latitude: lat,
          longitude: lon,
        });
      },
      (err) => {
        console.log(err);
      },
      {
        enableHighAccuracy: true,
      },
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, [userData?._id]);



  // Payment or status changed elsewhere (e.g. admin confirmed a transfer)
  const activeOrderId = activeOrder?.order?._id;
  useEffect(() => {
    if (!activeOrderId) return;
    const socket = getSocket();
    const onOrderUpdate = (data: { orderId: string }) => {
      if (String(data.orderId) === String(activeOrderId)) fetchCurrentOrder();
    };
    socket.on("order-status-update", onOrderUpdate);
    return () => {
      socket.off("order-status-update", onOrderUpdate);
    };
  }, [activeOrderId]);

  useEffect(() => {
    if (!userData?._id) return;
    Promise.all([fetchCurrentOrder(), fetchAssignments()]).finally(() =>
      setLoading(false),
    );
  }, [userData?._id]);

  if (activeOrder && userLocation) {
    return (
      <div className="p-4 pt-30 min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-green-700 mb-2">
            Active Delivery
          </h1>
          <p className="text-gray-600 text-sm mb-4">
            order#{activeOrder.order._id.slice(-6)}
          </p>

          <div className="rounded-xl border shadow-lg overflow-hidden mb-6">
            <LiveMap
              userLocation={userLocation}
              deliveryBoyLocation={deliveryBoyLocation}
            />
            {!deliveryBoyLocation && (
              <p className="text-xs text-gray-500 p-2">
                Allow location access so the customer can follow you live.
              </p>
            )}
          </div>
          <DeliveryChat
            orderId={activeOrder.order._id}
            deliveryBoyId={userData?._id!}
          />

          {/* Payment */}
          <div className="bg-white rounded-2xl shadow border p-5 mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500">Payment Method</p>
                <p className="font-semibold text-gray-800 flex items-center gap-2">
                  {activeOrder.order.paymentMethod === "cod" ? (
                    <>
                      <Banknote size={18} className="text-green-600" /> Cash on Delivery
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} className="text-green-600" /> Paid Online
                    </>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Payment Status</p>
                <span
                  className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${
                    activeOrder.order.isPaid
                      ? "bg-green-100 text-green-700 border-green-300"
                      : "bg-yellow-100 text-yellow-700 border-yellow-300"
                  }`}
                >
                  {activeOrder.order.isPaid ? "Paid" : "Pending"}
                </span>
              </div>
            </div>

            {activeOrder.order.paymentMethod === "cod" && !activeOrder.order.isPaid && (
              <>
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-600">Amount to Collect</p>
                  <p className="text-3xl font-extrabold text-green-700">
                    {formatMoney(activeOrder.order.totalAmount)}
                  </p>
                </div>
                <button
                  className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl shadow inline-flex items-center justify-center gap-2"
                  onClick={() => {
                    setCashError("");
                    setCashModalOpen(true);
                  }}
                >
                  <Banknote size={20} /> Cash Received
                </button>
              </>
            )}

            {activeOrder.order.isPaid && (
              <p className="mt-4 text-sm text-green-700 flex items-center gap-2">
                <CheckCircle size={16} />
                {activeOrder.order.paymentConfirmationMethod === "cash" &&
                activeOrder.order.paymentReceivedByRole === "deliveryBoy"
                  ? "Cash received"
                  : activeOrder.order.paymentMethod === "online"
                    ? "Paid online. Nothing to collect."
                    : `Paid (${PAYMENT_METHOD_LABELS[activeOrder.order.paymentConfirmationMethod as keyof typeof PAYMENT_METHOD_LABELS] ?? "confirmed"}, by ${ROLE_LABELS[activeOrder.order.paymentReceivedByRole as keyof typeof ROLE_LABELS] ?? "admin"}). Nothing to collect.`}
                {activeOrder.order.paidAt && (
                  <span className="text-gray-500">· {formatPaidAt(activeOrder.order.paidAt)}</span>
                )}
              </p>
            )}
            {cashError && !cashModalOpen && (
              <p role="alert" className="text-red-600 text-sm mt-3">
                {cashError}
              </p>
            )}
          </div>

          {cashModalOpen && (
            <ConfirmCashModal
              amount={activeOrder.order.totalAmount}
              saving={cashSaving}
              error={cashError}
              onCancel={() => setCashModalOpen(false)}
              onConfirm={handleCashReceived}
            />
          )}

          {actionError && (
            <p role="alert" className="text-red-600 text-sm mt-4">
              {actionError}
            </p>
          )}
          {activeOrder.order.paymentMethod === "cod" && !activeOrder.order.isPaid && (
            <p className="text-xs text-amber-700 mt-4">
              Payment is still pending. Confirm the cash above when you receive it.
            </p>
          )}
          <button
            className="w-full mt-4 mb-8 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl shadow disabled:opacity-60"
            onClick={handleDelivered}
            disabled={delivering}
          >
            {delivering ? "Saving..." : "Mark as delivered"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mt-30 mb-7.5">
          Delivery Assignments
        </h2>

        {actionError && (
          <p role="alert" className="text-red-600 text-sm -mt-4 mb-4">
            {actionError}
          </p>
        )}

        {loading && (
          <div className="p-5 bg-white rounded-xl shadow border text-gray-500 animate-pulse">
            Loading jobs...
          </div>
        )}
        {!loading && assignments.length === 0 && (
          <div className="p-8 bg-white rounded-xl shadow border text-center text-gray-500">
            No delivery jobs right now. New jobs appear here automatically when
            the admin sends an order out for delivery.
          </div>
        )}
        {assignments.map((a) => (
          <div
            key={a._id}
            className="p-5 bg-white rounded-xl shadow mb-4 border"
          >
            <p>
              <b>Order Id </b> #{a?.order._id.slice(-6)}
            </p>
            <p className="text-gray-600">{a.order.address.fullAddress}</p>

            <div className="flex gap-3 mt-4">
              <button
                className="flex-1 bg-green-600 text-white py-2 rounded-lg"
                onClick={() => handleAccept(a._id)}
              >
                Accept
              </button>
              <button
                className="flex-1 bg-red-600 text-white py-2 rounded-lg"
                onClick={() => handleReject(a._id)}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveryBoysDashboard;
