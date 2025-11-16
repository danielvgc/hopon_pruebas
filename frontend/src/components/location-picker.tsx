"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { initializeGoogleMapsLoader } from "@/lib/google-maps-loader";

declare global {
  interface Window {
    google: typeof google;
  }
}

interface LocationPickerProps {
  value: { address: string; lat?: number | null; lng?: number | null } | null;
  onChange: (location: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
}

interface PlacePrediction {
  description: string;
  place_id: string;
}

export default function LocationPicker({
  value,
  onChange,
  placeholder = "Search for a location...",
}: LocationPickerProps) {
  const [inputValue, setInputValue] = useState(value?.address || "");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Initialize global Google Maps loader
  useEffect(() => {
    if (!apiKey) {
      setApiError("Google Maps API key not configured");
      return;
    }

    initializeGoogleMapsLoader(apiKey)
      .then(() => {
        if (window.google?.maps?.places) {
          setApiReady(true);
          setApiError(null);
        } else {
          setApiError("Google Maps API failed to initialize");
        }
      })
      .catch((err) => {
        setApiError(`Failed to load Google Maps: ${err.message}`);
      });
  }, [apiKey]);

  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);

      if (!val || val.length < 2) {
        setPredictions([]);
        setShowPredictions(false);
        return;
      }

      if (!autocompleteServiceRef.current || !apiReady) {
        console.warn("Autocomplete service not ready");
        return;
      }

      setIsLoading(true);
      try {
        const result = await autocompleteServiceRef.current.getPlacePredictions({
          input: val,
          // Search globally - no country restrictions
        });

        setPredictions(
          result.predictions.map((p) => ({
            description: p.description,
            place_id: p.place_id,
          }))
        );
        setShowPredictions(true);
      } catch (error) {
        console.error("Error fetching predictions:", error);
        setPredictions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [apiReady]
  );

  const handleSelectPrediction = useCallback(
    (prediction: PlacePrediction) => {
      if (!placesServiceRef.current || !apiReady) {
        console.warn("Places service not ready");
        return;
      }

      setIsLoading(true);
      placesServiceRef.current.getDetails(
        { placeId: prediction.place_id, fields: ["geometry", "formatted_address"] },
        (place, status) => {
          setIsLoading(false);

          if (status !== google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
            console.error("Error getting place details:", status);
            return;
          }

          const location = {
            address: prediction.description,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          setInputValue(prediction.description);
          setPredictions([]);
          setShowPredictions(false);
          onChange(location);
        }
      );
    },
    [onChange, apiReady]
  );

  // Close predictions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPredictions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initialize services when Google Maps loads
  useEffect(() => {
    if (!apiReady || !window.google?.maps?.places) return;

    if (!autocompleteServiceRef.current) {
      try {
        autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
        const dummyDiv = document.createElement("div");
        const dummyMap = new window.google.maps.Map(dummyDiv);
        placesServiceRef.current = new window.google.maps.places.PlacesService(dummyMap);
      } catch (error) {
        console.error("Error initializing Google Maps services:", error);
        setApiError("Failed to initialize location services");
      }
    }
  }, [apiReady]);

  if (!apiKey) {
    return (
      <div className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-500">
        Google Maps API key not configured
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-500">
        Location services unavailable: {apiError}
      </div>
    );
  }

  if (!apiReady) {
    return (
      <div className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-neutral-400">
        Loading location services...
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => predictions.length > 0 && setShowPredictions(true)}
        placeholder={placeholder}
        className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-red-500" />
        </div>
      )}

      {/* Predictions dropdown */}
      {showPredictions && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-lg">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm hover:bg-neutral-800 active:bg-neutral-700 transition-colors border-b border-neutral-800 last:border-b-0"
            >
              <div className="font-medium text-neutral-100">{prediction.description}</div>
            </button>
          ))}
        </div>
      )}

      {/* Selected location display */}
      {value && (
        <div className="mt-1 text-xs text-neutral-400">
          Coordinates: {value.lat?.toFixed(4)}, {value.lng?.toFixed(4)}
        </div>
      )}
    </div>
  );
}
