"use client";
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet needs the browser's `window`, so this file must only be loaded
// client-side (the checkout page imports it with next/dynamic, ssr: false).

const markerIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/128/684/684908.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface Iprops {
  position: [number, number];
  onPositionChange: (position: [number, number]) => void;
}

const DraggableMarker = ({ position, onPositionChange }: Iprops) => {
  const map = useMap();
  useEffect(() => {
    map.setView(position as LatLngExpression, 15, { animate: true });
  }, [position, map]);

  return (
    <Marker
      icon={markerIcon}
      position={position as LatLngExpression}
      draggable={true}
      eventHandlers={{
        dragend: (e: L.LeafletEvent) => {
          const marker = e.target as L.Marker;
          const { lat, lng } = marker.getLatLng();
          onPositionChange([lat, lng]);
        },
      }}
    />
  );
};

const CheckoutMap = ({ position, onPositionChange }: Iprops) => {
  return (
    <MapContainer
      center={position as LatLngExpression}
      zoom={13}
      scrollWheelZoom={true}
      className="w-full h-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <DraggableMarker
        position={position}
        onPositionChange={onPositionChange}
      />
    </MapContainer>
  );
};

export default CheckoutMap;
