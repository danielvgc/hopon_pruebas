"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

declare global {
  interface Window {
    google: typeof google;
  }
}

interface LocationPickerProps {
  value: { address: string; lat?: number; lng?: number } | null;
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
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // Load Google Maps API
  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps) return; // Already loaded

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Don't remove script - it can be reused
    };
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

      if (!autocompleteServiceRef.current) return;

      setIsLoading(true);
      try {
        const result = await autocompleteServiceRef.current.getPlacePredictions({
          input: val,
          componentRestrictions: { country: "us" }, // Adjust countries as needed
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
    []
  );

  const handleSelectPrediction = useCallback(
    (prediction: PlacePrediction) => {
      if (!placesServiceRef.current) return;

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
    [onChange]
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

  if (!apiKey) {
    return (
      <div className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-500">
        Google Maps API key not configured
      </div>
    );
  }

  // Initialize services when Google Maps loads
  useEffect(() => {
    if (!window.google?.maps) return;

    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      const dummyDiv = document.createElement("div");
      const dummyMap = new window.google.maps.Map(dummyDiv);
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyMap);
    }
  }, []);

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
