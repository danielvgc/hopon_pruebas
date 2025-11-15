"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WebLayout from "@/components/web-layout";
import { useAuth } from "@/context/auth-context";

type SignupMode = "email";

export default function SignupPage() {
  useEffect(() => {
    document.title = "Create Account - HopOn";
  }, []);

  const router = useRouter();
  const { signup, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<SignupMode | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email || !password || !confirmPassword || !username) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (username.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }

    setLoading(true);

    try {
      await signup({ email, password, username });
      router.push("/profile");
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : "Failed to sign up. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/profile");
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Failed to sign up with Google";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WebLayout title="Create Account">
      <div className="mx-auto max-w-md space-y-6">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-8 backdrop-blur-sm">
          <h1 className="mb-2 text-3xl font-bold text-neutral-100">
            Join HopOn
          </h1>
          <p className="mb-8 text-sm text-neutral-400">
            Create an account to find sports events and players near you
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-200 border border-red-800">
              {error}
            </div>
          )}

          {/* No mode selected - show options */}
          {activeMode === null && (
            <div className="space-y-3">
              <button
                onClick={() => setActiveMode("email")}
                className="w-full rounded-lg bg-gradient-to-r from-red-500 to-red-600 py-3 font-semibold text-white hover:from-red-400 hover:to-red-500 transition shadow-lg hover:shadow-red-500/50"
              >
                Sign Up with Email
              </button>

              <button
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-3 font-semibold text-neutral-100 hover:bg-neutral-700 transition disabled:opacity-50"
              >
                {loading ? "Loading..." : "Sign Up with Google"}
              </button>

              {/* Divider */}
              <div className="my-4 flex items-center">
                <div className="flex-1 border-t border-neutral-700"></div>
                <span className="px-3 text-xs text-neutral-500">or</span>
                <div className="flex-1 border-t border-neutral-700"></div>
              </div>

              <Link
                href="/login"
                className="block text-center text-sm text-neutral-400 hover:text-neutral-300 py-2 transition"
              >
                Already have an account? <span className="text-red-400 hover:text-red-300 font-semibold">Sign In</span>
              </Link>
            </div>
          )}

          {/* Email Sign Up Form */}
          {activeMode === "email" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-neutral-200 mb-2"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  autoFocus
                />
                <p className="mt-1 text-xs text-neutral-400">
                  2+ characters, letters, numbers, underscores
                </p>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-neutral-200 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-neutral-200 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-neutral-200 mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-red-500 to-red-600 py-2 font-semibold text-white hover:from-red-400 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>

              <button
                type="button"
                onClick={() => setActiveMode(null)}
                className="w-full text-sm text-neutral-400 hover:text-neutral-300 py-2"
              >
                ← Back to options
              </button>
            </form>
          )}
        </div>
      </div>
    </WebLayout>
  );
}
