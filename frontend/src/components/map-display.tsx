"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { HopOnEvent } from "@/lib/api";
import { initializeGoogleMapsLoader } from "@/lib/google-maps-loader";

interface MapDisplayProps {
  events: HopOnEvent[];
  selectedEventId?: number;
  onEventSelect?: (event: HopOnEvent) => void;
  height?: string;
  center?: { lat: number; lng: number };
  showUserLocation?: boolean;
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
  center,
  showUserLocation = false,
}: MapDisplayProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userLocationMarkerRef = useRef<google.maps.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<HopOnEvent | null>(null);

  const handleRecenterOnUserLocation = () => {
    if (userLocation && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(userLocation);
      mapInstanceRef.current.setZoom(13);
    }
  };

  // Initialize global Google Maps loader
  useEffect(() => {
    if (!apiKey) {
      setError("Google Maps API key not configured");
      setLoading(false);
      return;
    }

    initializeGoogleMapsLoader(apiKey)
      .then(() => {
        if (window.google?.maps) {
          setLoading(false);
          setError(null);
        } else {
          setError("Google Maps API failed to initialize");
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(`Failed to load Google Maps: ${err.message}`);
        setLoading(false);
      });
  }, [apiKey]);

  // Get real-time user location when showUserLocation is true
  useEffect(() => {
    if (!showUserLocation || typeof navigator === "undefined") return;

    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }

    // Watch user's position
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      (error) => {
        console.warn("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [showUserLocation]);

  // Initialize map
  useEffect(() => {
    if (loading || !mapRef.current || !window.google?.maps || events.length === 0) return;

    if (!mapInstanceRef.current) {
      // Priority: 1) Real-time user location, 2) Provided center, 3) Event average
      let mapCenter;
      
      if (userLocation) {
        // Use real-time location if available
        mapCenter = userLocation;
      } else if (center && center.lat && center.lng) {
        // Fall back to provided center
        mapCenter = center;
      } else {
        // Calculate center from all events
        const validEvents = events.filter((e) => e.latitude && e.longitude);
        if (validEvents.length === 0) return;

        mapCenter = {
          lat: validEvents.reduce((sum, e) => sum + (e.latitude || 0), 0) / validEvents.length,
          lng: validEvents.reduce((sum, e) => sum + (e.longitude || 0), 0) / validEvents.length,
        };
      }

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        zoom: 13,
        center: mapCenter,
        draggable: true,
        gestureHandling: "greedy",
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
        setSelectedEvent(event);
        onEventSelect?.(event);
      });

      markersRef.current.push(marker);
    });
  }, [events, selectedEventId, loading, onEventSelect]);

  // Update user location marker
  useEffect(() => {
    if (!showUserLocation || !userLocation || !mapInstanceRef.current || loading || !window.google?.maps) {
      return;
    }

    if (!userLocationMarkerRef.current) {
      // Create user location marker with blue circle style
      userLocationMarkerRef.current = new window.google.maps.Marker({
        position: userLocation,
        map: mapInstanceRef.current,
        title: "Your Location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    } else {
      // Update existing marker position
      userLocationMarkerRef.current.setPosition(userLocation);
    }
  }, [userLocation, loading, showUserLocation]);

  // Pan map to real-time location when it updates
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    
    mapInstanceRef.current.panTo(userLocation);
  }, [userLocation]);

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

  if (error) {
    return (
      <div
        className="w-full bg-neutral-900/50 rounded-lg border border-neutral-700 flex items-center justify-center"
        style={{ height }}
      >
        <p className="text-xs sm:text-sm text-red-500">Map unavailable: {error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg border border-neutral-700 overflow-hidden">
      <div
        ref={mapRef}
        className="w-full bg-neutral-950"
        style={{ height }}
      />

      {/* Recenter Button */}
      {userLocation && (
        <button
          onClick={handleRecenterOnUserLocation}
          className="absolute bottom-4 left-4 bg-white hover:bg-neutral-100 text-neutral-900 rounded-full p-2 sm:p-3 shadow-lg z-20 transition flex items-center justify-center"
          title="Center map on your location"
        >
          <MapPin size={20} strokeWidth={2.5} />
        </button>
      )}
      
      {/* Event Info Popup Card */}
      {selectedEvent && (
        <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-neutral-900 border border-neutral-700 rounded-lg p-3 sm:p-4 shadow-lg z-10">
          <div className="space-y-2 sm:space-y-3">
            {/* Event Title and Sport */}
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-white line-clamp-2">
                {selectedEvent.name}
              </h3>
              <p className="text-xs sm:text-sm text-red-500 font-medium">
                {selectedEvent.sport}
              </p>
            </div>

            {/* Location */}
            {selectedEvent.location && (
              <p className="text-xs sm:text-sm text-neutral-300">
                📍 {selectedEvent.location}
              </p>
            )}

            {/* Date and Time */}
            {selectedEvent.event_date && (
              <p className="text-xs sm:text-sm text-neutral-300">
                📅 {new Date(selectedEvent.event_date).toLocaleDateString()} at{" "}
                {new Date(selectedEvent.event_date).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {/* Players Count */}
            <p className="text-xs sm:text-sm text-neutral-300">
              👥 {selectedEvent.current_players}/{selectedEvent.max_players} players
            </p>

            {/* Skill Level */}
            {selectedEvent.skill_level && (
              <p className="text-xs sm:text-sm text-neutral-300">
                Level: <span className="text-yellow-400">{selectedEvent.skill_level}</span>
              </p>
            )}

            {/* Host */}
            {selectedEvent.host && (
              <p className="text-xs sm:text-sm text-neutral-400">
                Host: {selectedEvent.host.username}
              </p>
            )}

            {/* Close Button */}
            <button
              onClick={() => setSelectedEvent(null)}
              className="w-full mt-2 bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm py-2 rounded transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}