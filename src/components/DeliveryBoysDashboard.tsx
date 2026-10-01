"use client";
import { getSocket } from "@/lib/socket";
import { IDeliveryAssignment } from "@/models/deliveryAssignment.model";
import { RootState } from "@/redux/store";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import LiveMap from "./LiveMap";
import DeliveryChat from "./DeliveryChat";

interface ILocation {
  latitude: number;
  longitude: number;
}

const DeliveryBoysDashboard = () => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [actionError, setActionError] = useState("");

  const { userData } = useSelector((state: RootState) => state.user);

  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<ILocation>({
    latitude: 0,
    longitude: 0,
  });
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState<ILocation>({
    latitude: 0,
    longitude: 0,
  });

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
      setAssignments((prev) => [...prev, deliveryAssignment]);
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

  useEffect(():any=>{
const socket=getSocket()
socket.on("update-deliveryBoy-location",({userId,location})=>{
  setDeliveryBoyLocation({
    latitude:location.coordinates[1],
    longitude:location.coordinates[0]
  })
})
return ()=>socket.off("update-deliveryBoy-location")
},[])

  useEffect(() => {
    fetchCurrentOrder();
    fetchAssignments();
  }, [userData]);

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
          </div>
          <DeliveryChat
            orderId={activeOrder.order._id}
            deliveryBoyId={userData?._id!}
          />
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
