"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Api } from "@/lib/api";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import WebLayout from "@/components/web-layout";

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

export default function SetupUsernamePage() {
  useEffect(() => {
    document.title = "Complete Your Profile - HopOn";
  }, []);

  const router = useRouter();
  const { user, status, setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState<string | null>(null);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // If user is authenticated but doesn't need username setup, redirect to profile
  useEffect(() => {
    if (status === "authenticated" && user) {
      console.log("[SetupAccount] User authenticated, needs_username_setup:", user.needs_username_setup);
      // If user already has a proper setup, redirect to profile
      if (!user.needs_username_setup) {
        router.push("/profile");
      }
    } else if (status === "guest") {
      // If not authenticated, redirect to login
      router.push("/login");
    }
  }, [status, user, router]);

  const checkUsernameAvailability = async (value: string) => {
    console.log("[SetupAccount] Checking username:", value);

    if (!value) {
      setUsernameAvailable(null);
      return;
    }

    if (value.length < 3) {
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    try {
      const response = await Api.checkUsernameAvailable(value);
      console.log("[SetupAccount] Username check response:", response);
      setUsernameAvailable(response.available === true);
    } catch (error) {
      console.error("[SetupAccount] Error checking username:", error);
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    setErrorMessage("");
    checkUsernameAvailability(value);
  };

  const handleSportToggle = (sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username) {
      setErrorMessage("Username is required");
      return;
    }

    if (username.length < 3) {
      setErrorMessage("Username must be at least 3 characters");
      return;
    }

    if (!usernameAvailable) {
      setErrorMessage("Username is not available");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const response = await Api.setupAccount({
        username,
        bio: bio || undefined,
        location: location || null,
        sports: selectedSports.length > 0 ? selectedSports : undefined,
      });

      console.log("[SetupAccount] Account setup successfully, user:", response.user);

      // Update user in auth context
      if (setUser) {
        setUser(response.user);
      }

      // Redirect to profile
      setTimeout(() => {
        router.push("/profile");
      }, 500);
    } catch (error) {
      console.error("[SetupAccount] Error setting up account:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to setup account");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading" || !user) {
    return (
      <WebLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
              <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
            </div>
            <p className="text-neutral-400">Loading...</p>
          </div>
        </div>
      </WebLayout>
    );
  }

  return (
    <WebLayout>
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Card */}
          <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-8 shadow-2xl">
            {/* Decorative elements */}
            <div className="absolute inset-0 rounded-3xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -z-10"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -z-10"></div>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Complete Your Profile
              </h1>
              <p className="text-neutral-400 text-sm">
                Let&apos;s set up your profile to help you find and join games!
              </p>
            </div>

            {/* Current email info */}
            <div className="mb-6 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700">
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Signed in as</p>
              <p className="text-white font-medium break-all">{user.email}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Username <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={handleUsernameChange}
                    placeholder="Choose a username"
                    className="w-full px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-800/50 text-white placeholder-neutral-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition pr-10"
                    autoFocus
                    disabled={isSaving}
                  />
                  {username && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername ? (
                        <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                      ) : usernameAvailable ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <p className="text-neutral-500">• 3-50 characters</p>
                  <p className="text-neutral-500">• Letters, numbers, underscores</p>
                  {username && username.length > 0 && username.length < 3 && (
                    <p className="text-red-400">• Too short (minimum 3 characters)</p>
                  )}
                  {usernameAvailable === true && (
                    <p className="text-green-400">✓ Username is available</p>
                  )}
                  {usernameAvailable === false && username.length >= 3 && (
                    <p className="text-red-400">✗ Username already taken or invalid</p>
                  )}
                </div>
              </div>

              {/* Bio Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Bio <span className="text-neutral-500 text-xs">(Optional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell other players about yourself..."
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-800/50 text-white placeholder-neutral-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition resize-none"
                  rows={3}
                  disabled={isSaving}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  {bio.length}/500 characters
                </p>
              </div>

              {/* Location Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Location <span className="text-neutral-500 text-xs">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={location || ""}
                  onChange={(e) => setLocation(e.target.value || null)}
                  placeholder="City, Country"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-800/50 text-white placeholder-neutral-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition"
                  disabled={isSaving}
                />
              </div>

              {/* Sports Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Favorite Sports <span className="text-neutral-500 text-xs">(Optional)</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {AVAILABLE_SPORTS.map((sport) => (
                    <button
                      key={sport}
                      type="button"
                      onClick={() => handleSportToggle(sport)}
                      disabled={isSaving}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                        selectedSports.includes(sport)
                          ? "bg-red-500/30 border border-red-500/60 text-red-200"
                          : "bg-neutral-800/50 border border-neutral-700 text-neutral-400 hover:border-neutral-600 hover:text-neutral-300"
                      } disabled:opacity-50`}
                    >
                      {selectedSports.includes(sport) && "✓ "}
                      {sport}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  Selected: {selectedSports.length > 0 ? selectedSports.join(", ") : "None"}
                </p>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40">
                  <p className="text-sm text-red-300">{errorMessage}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  !username ||
                  !usernameAvailable ||
                  isSaving ||
                  checkingUsername
                }
                className="w-full px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold transition duration-200 flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Setting up profile..." : "Complete Profile"}
              </button>
            </form>

            {/* Info */}
            <p className="text-xs text-neutral-500 text-center mt-6">
              You can change these anytime in your profile settings.
            </p>
          </div>
        </div>
      </div>
    </WebLayout>
  );
}
