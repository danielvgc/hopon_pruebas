"use client";

import { useState, useEffect } from "react";
import { X, Check, AlertCircle, Loader2 } from "lucide-react";
import LocationPicker from "./location-picker";
import { Api } from "@/lib/api";

const AVAILABLE_SPORTS = [
  "Basketball",
  "Football",
  "Soccer",
  "Tennis",
  "Volleyball",
  "Baseball",
  "Badminton",
  "Hockey",
  "Rugby",
  "Pickleball",
  "Table Tennis",
  "Squash",
];

interface AccountSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export default function AccountSetupModal({ isOpen, onComplete }: AccountSetupModalProps) {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Check username availability
  useEffect(() => {
    if (!username || username.length < 2) {
      setUsernameAvailable(null);
      return;
    }

    const checkUsername = async () => {
      setCheckingUsername(true);
      try {
        const response = await Api.checkUsernameAvailable(username);
        setUsernameAvailable(response.available);
      } catch (error) {
        console.error("Error checking username:", error);
        setUsernameAvailable(null);
      } finally {
        setCheckingUsername(false);
      }
    };

    const debounceTimer = setTimeout(checkUsername, 500);
    return () => clearTimeout(debounceTimer);
  }, [username]);

  const handleSportToggle = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    // Validation
    if (!username || username.length < 2) {
      setErrorMessage("Username must be at least 2 characters");
      return;
    }

    if (!usernameAvailable) {
      setErrorMessage("Username is not available");
      return;
    }

    if (!location) {
      setErrorMessage("Location is required");
      return;
    }

    if (selectedSports.length === 0) {
      setErrorMessage("Please select at least one sport");
      return;
    }

    setIsSaving(true);
    try {
      // Update user profile
      const response = await Api.setupAccount({
        username,
        bio: bio || undefined,
        location: location.address,
        latitude: location.lat,
        longitude: location.lng,
        sports: selectedSports,
      });

      if (response) {
        setSuccessMessage("Profile setup complete!");
        setTimeout(() => {
          onComplete();
        }, 500);
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Failed to save profile";
      setErrorMessage(errMsg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8 shadow-2xl max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Complete Your Profile</h2>
        </div>

        <p className="text-neutral-400 text-sm mb-6">
          Set up your profile to get started. You can always update these later.
        </p>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-green-500/20 text-green-300 border border-green-500/40 text-sm">
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 mb-6">
          {/* Username */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1 sm:mb-2">
              Username <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose your username"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800/50 text-white placeholder-neutral-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition pr-10"
              />
              {username && username.length >= 2 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {checkingUsername ? (
                    <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
                  ) : usernameAvailable ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>
              )}
            </div>
            {username && username.length >= 2 && usernameAvailable === false && !checkingUsername && (
              <p className="text-xs text-red-400 mt-1">Username already taken</p>
            )}
            {username && username.length >= 2 && usernameAvailable && (
              <p className="text-xs text-green-400 mt-1">Username is available</p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1 sm:mb-2">
              Bio <span className="text-neutral-500 text-xs">(optional)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800/50 text-white placeholder-neutral-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition resize-none"
              rows={2}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1 sm:mb-2">
              Location <span className="text-red-400">*</span>
            </label>
            <LocationPicker
              value={location}
              onChange={setLocation}
              placeholder="Search for your location..."
            />
          </div>

          {/* Sports */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-neutral-300 mb-3">
              Favorite Sports <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_SPORTS.map((sport) => {
                const isSelected = selectedSports.includes(sport);
                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => handleSportToggle(sport)}
                    className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition border ${
                      isSelected
                        ? "bg-red-500/30 border-red-500/60 text-red-200"
                        : "bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:border-red-500/40 hover:bg-neutral-800/70"
                    }`}
                  >
                    {isSelected && <span className="mr-1">✓</span>}
                    {sport}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              {selectedSports.length > 0
                ? `${selectedSports.length} sport${selectedSports.length !== 1 ? "s" : ""} selected`
                : "Select at least one sport"}
            </p>
          </div>
        </form>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={isSaving || !username || !location || selectedSports.length === 0 || !usernameAvailable}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 hover:border-red-400 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Setting up..." : "Complete Setup"}
          </button>
        </div>
      </div>
    </div>
  );
}
