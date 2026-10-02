"use client";
import React, { useEffect } from "react";
import L, { LatLngExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface ILocation {
  latitude: number;
  longitude: number;
}

interface Iprops {
  userLocation: ILocation;
  deliveryBoyLocation?: ILocation | null; // Made optional/nullable for safety
}

// Helper component to handle dynamic re-centering
function ChangeView({ center }: { center: LatLngExpression }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

const LiveMap = ({ userLocation, deliveryBoyLocation }: Iprops) => {
  // 1. Define Icons
  const deliveryBoyIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/128/5457/5457815.png",
    iconSize: [45, 45],
    iconAnchor: [22, 45], // Anchors the "tip" of the icon to the coordinate
  });

  const userIcon = L.icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/128/4821/4821951.png",
    iconSize: [45, 45],
    iconAnchor: [22, 45],
  });

  const linePositions =
    deliveryBoyLocation && userLocation
      ? [
          [userLocation.latitude, userLocation.longitude],
          [deliveryBoyLocation.latitude, deliveryBoyLocation.longitude],
        ]
      : [];

  // 2. Determine Center (Priority to Delivery Boy)
  const center: LatLngExpression = deliveryBoyLocation
    ? [deliveryBoyLocation.latitude, deliveryBoyLocation.longitude]
    : [userLocation.latitude, userLocation.longitude];

  return (
    <div className="w-full h-125 rounded-xl overflow-hidden shadow-lg relative border border-gray-200">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Component to update map view when center prop changes */}
        <ChangeView center={center} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Marker */}
        <Marker
          position={[userLocation.latitude, userLocation.longitude]}
          icon={userIcon}
        >
          <Popup>Delivery Address</Popup>
        </Marker>

        {/* Delivery Boy Marker - Fixed to use deliveryBoyIcon */}
        {deliveryBoyLocation && (
          <Marker
            position={[
              deliveryBoyLocation.latitude,
              deliveryBoyLocation.longitude,
            ]}
            icon={deliveryBoyIcon}
          >
            <Popup>Delivery Boy</Popup>
          </Marker>
        )}
        <Polyline positions={linePositions as any} color="green" />
      </MapContainer>
    </div>
  );
};

export default LiveMap;
