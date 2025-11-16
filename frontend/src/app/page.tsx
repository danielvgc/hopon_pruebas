"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";

export default function LandingPage() {
  useEffect(() => {
    document.title = "HopOn - Find Pickup Games Nearby";
  }, []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-neutral-950 via-neutral-950 to-red-950/10 px-6 py-12 text-neutral-100">
      <div className="mx-auto max-w-2xl text-center space-y-8">
        {/* Logo/Branding */}
        <div className="space-y-4">
          <div className="flex justify-center">
            <Image 
              src="/logo.png" 
              alt="HopOn Logo" 
              width={120} 
              height={120} 
              className="h-24 w-24"
              priority
            />
          </div>
          <p className="text-sm font-semibold text-neutral-300">Find your next game</p>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-100 leading-tight">
          Find pickup games nearby, connect with players
        </h1>
        
        {/* Subheading */}
        <p className="text-lg text-neutral-400 max-w-xl mx-auto">
          Join sports enthusiasts in your area. Discover games, meet players, and never miss an opportunity to play.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center pt-4">
          <Link
            href="/signup"
            className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-8 py-3 text-base font-semibold text-white transition hover:from-red-400 hover:to-red-500 shadow-lg hover:shadow-red-500/50"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border-2 border-red-500 px-8 py-3 text-base font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
          >
            Log In
          </Link>
          <Link
            href="/discover"
            className="rounded-lg border border-neutral-700 bg-neutral-900/50 px-8 py-3 text-base font-semibold text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-800"
          >
            Browse as Guest
          </Link>
        </div>

        {/* Features */}
        <div className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div className="space-y-2">
            <div className="text-2xl">🏃</div>
            <h3 className="font-semibold text-neutral-100">Find Games</h3>
            <p className="text-sm text-neutral-400">Discover sports events and pickup games near you</p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">👥</div>
            <h3 className="font-semibold text-neutral-100">Connect</h3>
            <p className="text-sm text-neutral-400">Meet other players who share your interests</p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl">📍</div>
            <h3 className="font-semibold text-neutral-100">Nearby</h3>
            <p className="text-sm text-neutral-400">Get matched with players in your area</p>
          </div>
        </div>
      </div>
    </div>
  );
}
