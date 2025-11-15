"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { API_BASE_URL } from "@/lib/api";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import WebLayout from "@/components/web-layout";

export default function SetupUsernamePage() {
  useEffect(() => {
    document.title = "Choose Username - HopOn";
  }, []);

  const router = useRouter();
  const { user, status, setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // If user is authenticated but doesn't need username setup, redirect to profile
  useEffect(() => {
    if (status === "authenticated" && user) {
      console.log("[SetupUsername] User authenticated, needs_username_setup:", user.needs_username_setup);
      // If user already has a proper username (not just auto-generated), redirect to profile
      if (!user.needs_username_setup) {
        router.push("/profile");
      }
    } else if (status === "guest") {
      // If not authenticated, redirect to login
      router.push("/login");
    }
  }, [status, user, router]);

  const checkUsernameAvailability = async (value: string) => {
    console.log("[SetupUsername] Checking username:", value);

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
      const response = await fetch(
        `${API_BASE_URL}/auth/username-available?username=${encodeURIComponent(value)}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();
      console.log("[SetupUsername] Username check response:", data);
      setUsernameAvailable(data.available === true);
    } catch (error) {
      console.error("[SetupUsername] Error checking username:", error);
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
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set username");
      }

      const data = await response.json();
      console.log("[SetupUsername] Username set successfully, user:", data.user);

      // Update user in auth context
      if (setUser) {
        setUser(data.user);
      }

      // Redirect to profile
      setTimeout(() => {
        router.push("/profile");
      }, 500);
    } catch (error) {
      console.error("[SetupUsername] Error setting username:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to set username");
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
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-8 shadow-2xl">
            {/* Decorative elements */}
            <div className="absolute inset-0 rounded-3xl">
              <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -z-10"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -z-10"></div>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Choose Your Username</h1>
              <p className="text-neutral-400 text-sm">
                Welcome! Set your unique username to complete your profile.
              </p>
            </div>

            {/* Current email info */}
            <div className="mb-6 p-4 rounded-xl bg-neutral-800/50 border border-neutral-700">
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Signed in as</p>
              <p className="text-white font-medium">{user.email}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Username
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

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40">
                  <p className="text-sm text-red-300">{errorMessage}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!username || !usernameAvailable || isSaving || checkingUsername}
                className="w-full px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold transition duration-200 flex items-center justify-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? "Setting up..." : "Continue to Profile"}
              </button>
            </form>

            {/* Info */}
            <p className="text-xs text-neutral-500 text-center mt-6">
              You can change your username anytime in your profile settings.
            </p>
          </div>
        </div>
      </div>
    </WebLayout>
  );
}
