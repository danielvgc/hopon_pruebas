"use client";

import React, { useEffect, useRef, useState } from "react";
import { HopOnEvent } from "@/lib/api";

interface MapDisplayProps {
  events: HopOnEvent[];
  selectedEventId?: number;
  onEventSelect?: (event: HopOnEvent) => void;
  height?: string;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

export default function MapDisplay({
  events,
  selectedEventId,
  onEventSelect,
  height = "300px",
}: MapDisplayProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [loading, setLoading] = useState(true);

  // Load Google Maps API
  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps) {
      setLoading(false);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setLoading(false);
    document.head.appendChild(script);
  }, [apiKey]);

  // Initialize map
  useEffect(() => {
    if (loading || !mapRef.current || !window.google?.maps || events.length === 0) return;

    if (!mapInstanceRef.current) {
      // Calculate center from all events
      const validEvents = events.filter((e) => e.latitude && e.longitude);
      if (validEvents.length === 0) return;

      const center = {
        lat: validEvents.reduce((sum, e) => sum + (e.latitude || 0), 0) / validEvents.length,
        lng: validEvents.reduce((sum, e) => sum + (e.longitude || 0), 0) / validEvents.length,
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center,
        styles: [
          { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
          },
          {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }],
          },
          {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9080" }],
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
          },
          {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
          },
          {
            featureType: "road.highway.controlled_access",
            elementType: "geometry",
            stylers: [{ color: "#9c6c38" }],
          },
          {
            featureType: "road.highway.controlled_access",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
          },
          {
            featureType: "all",
            elementType: "labels.icon",
            stylers: [{ visibility: "off" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }],
          },
          {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }],
          },
        ],
      });
    }

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Add markers for each event
    events.forEach((event) => {
      if (!event.latitude || !event.longitude || !mapInstanceRef.current) return;

      const isSelected = event.id === selectedEventId;
      const marker = new window.google.maps.Marker({
        position: { lat: event.latitude, lng: event.longitude },
        map: mapInstanceRef.current,
        title: event.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 12 : 8,
          fillColor: isSelected ? "#ef4444" : "#dc2626",
          fillOpacity: 1,
          strokeColor: isSelected ? "#fff" : "#dc2626",
          strokeWeight: isSelected ? 3 : 0,
        },
      });

      marker.addListener("click", () => {
        onEventSelect?.(event);
      });

      markersRef.current.push(marker);
    });
  }, [events, selectedEventId, loading, onEventSelect]);

  if (!apiKey) {
    return (
      <div
        className="w-full bg-neutral-900/50 rounded-lg border border-neutral-700 flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-xs sm:text-sm text-red-500">Google Maps API key not configured</p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full rounded-lg border border-neutral-700 bg-neutral-950"
      style={{ height }}
    />
  );
}
