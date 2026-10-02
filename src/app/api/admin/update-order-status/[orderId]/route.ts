import emitEventHandler from "@/lib/emitEventHandler";
import connectDb from "@/lib/mongodb";
import { requireAuth } from "@/lib/requireAuth";
import DeliveryAssignment from "@/models/deliveryAssignment.model";
import Order from "@/models/order.model";
import User from "@/models/user.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const MAX_RIDER_DISTANCE_METERS = 10000;

/**
 * Riders within 10 km of the delivery address, nearest first.
 * Uses MongoDB's geospatial $near query (needs the 2dsphere index on
 * User.location). If that index is missing, it falls back to measuring the
 * distance in code, so the admin can still dispatch the order.
 */
async function findRidersNear(longitude: number, latitude: number) {
  try {
    return await User.find({
      role: "deliveryBoy",
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: MAX_RIDER_DISTANCE_METERS,
        },
      },
    });
  } catch (error) {
    console.warn("$near query failed, using in-code distance instead:", error);
    const riders = await User.find({ role: "deliveryBoy" });
    const distance = (coords: number[]) => {
      // Haversine formula: distance in meters between two lat/lng points
      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const [lng2, lat2] = coords;
      const dLat = toRad(lat2 - latitude);
      const dLng = toRad(lng2 - longitude);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(latitude)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };
    return riders
      .map((rider) => ({ rider, d: distance(rider.location?.coordinates ?? [0, 0]) }))
      .filter((r) => r.d <= MAX_RIDER_DISTANCE_METERS)
      .sort((a, b) => a.d - b.d)
      .map((r) => r.rider);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const authResult = await requireAuth(["admin"]);
    if ("error" in authResult) return authResult.error;

    await connectDb();
    const { orderId } = await params;
    const { status } = await req.json();

    // Admins can only move an order between these two. "delivered" is set by
    // the assigned rider (mark-delivered), never from here.
    if (!["pending", "out of delivery"].includes(status)) {
      return NextResponse.json({ message: "invalid status" }, { status: 400 });
    }

    if (!mongoose.isValidObjectId(orderId)) {
      return NextResponse.json({ message: "order not found" }, { status: 404 });
    }
    const order = await Order.findById(orderId).populate("user");
    if (!order) {
      return NextResponse.json({ message: "order not found" }, { status: 404 });
    }
    if (order.status === "delivered") {
      return NextResponse.json(
        { message: "a delivered order cannot be changed" },
        { status: 400 },
      );
    }

    order.status = status;
    let deliveryBoysPayload: {
      id: unknown;
      name: string;
      mobile?: string;
      latitude: number;
      longitude: number;
    }[] = [];
    if (status === "out of delivery" && !order.assignment) {
      const { latitude, longitude } = order.address;
      const nearByDeliveryBoys = await findRidersNear(
        Number(longitude),
        Number(latitude),
      );
      const nearByIds = nearByDeliveryBoys.map((b) => b._id);
      const busyIds = await DeliveryAssignment.find({
        assignedTo: { $in: nearByIds },
        status: { $nin: ["brodcasted", "completed"] },
      }).distinct("assignedTo");
      const busyIdSet = new Set(busyIds.map((b) => String(b)));
      const availableDeliveryBoys = nearByDeliveryBoys.filter(
        (b) => !busyIdSet.has(String(b._id)),
      );
      const candidates = availableDeliveryBoys.map((b) => b._id);

      if (candidates.length == 0) {
        await order.save();

        await emitEventHandler("order-status-update", {
          orderId: order._id,
          status: order.status,
        });

        return NextResponse.json(
          { message: "There is no available delivery boys" },
          { status: 200 },
        );
      }
      const deliveryAssignment = await DeliveryAssignment.create({
        order: order._id,
        brodcastedTo: candidates,
        status: "brodcasted",
      });

      await deliveryAssignment.populate("order");
      // Offer the job live to every candidate rider who is online
      for (const boy of availableDeliveryBoys) {
        if (boy.socketId) {
          await emitEventHandler(
            "new-assignment",
            deliveryAssignment,
            boy.socketId,
          );
        }
      }

      order.assignment = deliveryAssignment._id;
      deliveryBoysPayload = availableDeliveryBoys.map((b) => ({
        id: b._id,
        name: b.name,
        mobile: b.mobile,
        latitude: b.location.coordinates[1],
        longitude: b.location.coordinates[0],
      }));
      await deliveryAssignment.populate("order");
    }

    await order.save();
    await order.populate("user");

    await emitEventHandler("order-status-update", {
      orderId: order._id,
      status: order.status,
    });

    return NextResponse.json(
      {
        assignment: order.assignment?._id,
        availableBoys: deliveryBoysPayload,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: `Update status error ${error}` },
      { status: 500 },
    );
  }
}
