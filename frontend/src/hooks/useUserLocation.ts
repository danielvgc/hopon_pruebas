import { useState, useEffect, useRef } from "react";

interface LocationCoords {
  lat: number;
  lng: number;
}

/**
 * Hook to get user's current location with fallback to profile location.
 * Attempts to get real-time geolocation first, falls back to profile location if:
 * - User denies permission
 * - Geolocation not supported
 * - Error occurs
 * 
 * Note: Mobile Safari requires user interaction to request geolocation
 */
export function useUserLocation(profileLocation?: { lat?: number; lng?: number } | null) {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const watchIdRef = useRef<number | null>(null);
  const permissionCheckedRef = useRef(false);

  useEffect(() => {
    // If we already checked permissions, don't try again
    if (permissionCheckedRef.current) {
      return;
    }

    try {
      if (typeof navigator === "undefined") {
        // Fallback to profile location if not in browser
        if (profileLocation?.lat && profileLocation?.lng) {
          setLocation({ lat: profileLocation.lat, lng: profileLocation.lng });
        }
        setIsLoadingLocation(false);
        return;
      }

      if (!navigator.geolocation) {
        console.warn("[useUserLocation] Geolocation not supported, using profile location");
        // Fallback to profile location
        if (profileLocation?.lat && profileLocation?.lng) {
          setLocation({ lat: profileLocation.lat, lng: profileLocation.lng });
        }
        setIsLoadingLocation(false);
        permissionCheckedRef.current = true;
        return;
      }

      // Try to get current position (this will prompt for permission on first call)
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          try {
            const { latitude, longitude } = position.coords;
            console.log("[useUserLocation] Got real-time location:", latitude, longitude);
            setLocation({ lat: latitude, lng: longitude });
            setIsLoadingLocation(false);
            permissionCheckedRef.current = true;
          } catch (err) {
            console.error("[useUserLocation] Error processing position:", err);
            fallbackToProfileLocation();
          }
        },
        (error) => {
          console.warn("[useUserLocation] Geolocation error:", error.code, error.message);
          // Fallback to profile location on error
          fallbackToProfileLocation();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // Increased timeout for mobile
          maximumAge: 30000, // Cache position for 30 seconds
        }
      );

      watchIdRef.current = watchId;

      return () => {
        if (watchIdRef.current !== null) {
          try {
            navigator.geolocation.clearWatch(watchIdRef.current);
          } catch (err) {
            console.warn("[useUserLocation] Error clearing watch:", err);
          }
        }
      };
    } catch (err) {
      console.error("[useUserLocation] Unexpected error in useEffect:", err);
      fallbackToProfileLocation();
    }

    function fallbackToProfileLocation() {
      if (profileLocation?.lat && profileLocation?.lng) {
        console.log("[useUserLocation] Falling back to profile location:", profileLocation);
        setLocation({ lat: profileLocation.lat, lng: profileLocation.lng });
      }
      setIsLoadingLocation(false);
      permissionCheckedRef.current = true;
    }
  }, [profileLocation?.lat, profileLocation?.lng]);

  return { location, isLoadingLocation };
}
