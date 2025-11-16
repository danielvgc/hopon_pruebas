"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WebLayout from "@/components/web-layout";
import { useAuth } from "@/context/auth-context";

type LoginMode = "credentials" | "google" | "demo";

export default function LoginPage() {
  useEffect(() => {
    document.title = "Log In - HopOn";
  }, []);
  const router = useRouter();
  const { login, loginWithGoogle, loginAsDemo } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<LoginMode | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);

    try {
      await login({ email, password });
      router.push("/profile");
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Failed to log in. Please try again.";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginAsDemo({ username: "Demo User" });
      router.push("/profile");
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Failed to log in as demo user";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/profile");
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Failed to log in with Google";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WebLayout title="Log In">
      <div className="mx-auto max-w-md space-y-6">
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-8 backdrop-blur-sm">
          <h1 className="mb-2 text-3xl font-bold text-neutral-100">
            Welcome Back
          </h1>
          <p className="mb-8 text-sm text-neutral-400">
            Log in to your HopOn account to continue
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
                onClick={() => setActiveMode("credentials")}
                className="w-full rounded-lg bg-gradient-to-r from-red-500 to-red-600 py-3 font-semibold text-white hover:from-red-400 hover:to-red-500 transition shadow-lg hover:shadow-red-500/50"
              >
                Log In with Email
              </button>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-3 font-semibold text-neutral-100 hover:bg-neutral-700 transition disabled:opacity-50"
              >
                {loading ? "Loading..." : "Log In with Google"}
              </button>

              <button
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full rounded-lg border border-neutral-600 bg-neutral-800/50 py-3 font-semibold text-neutral-300 hover:bg-neutral-700/50 transition disabled:opacity-50 text-sm"
              >
                {loading ? "Loading..." : "Try as Demo User"}
              </button>
            </div>
          )}

          {/* Email/Password Form */}
          {activeMode === "credentials" && (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  autoFocus
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
                  placeholder="Your password"
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-red-500 to-red-600 py-2 font-semibold text-white hover:from-red-400 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
              >
                {loading ? "Logging In..." : "Log In"}
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

          {/* Divider */}
          {activeMode !== null && activeMode !== "credentials" && (
            <>
              <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-neutral-700"></div>
                <span className="px-3 text-sm text-neutral-400">or continue with</span>
                <div className="flex-1 border-t border-neutral-700"></div>
              </div>
            </>
          )}

          {/* Quick access buttons when in a specific mode */}
          {activeMode !== null && activeMode !== "credentials" && (
            <div className="space-y-3">
              {activeMode === "google" && (
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-3 font-semibold text-neutral-100 hover:bg-neutral-700 transition disabled:opacity-50"
                >
                  {loading ? "Connecting to Google..." : "Continue with Google"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveMode(null)}
                className="w-full text-sm text-neutral-400 hover:text-neutral-300 py-2"
              >
                ← Back to options
              </button>
            </div>
          )}

          {/* Sign Up Link */}
          <div className="mt-8 pt-6 border-t border-neutral-800 text-center text-sm text-neutral-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-red-400 hover:text-red-300 font-semibold">
              Create one
            </Link>
          </div>
        </div>
      </div>
    </WebLayout>
  );
}
