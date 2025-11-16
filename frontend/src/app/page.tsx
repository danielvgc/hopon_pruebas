"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";

export default function LandingPage() {
  useEffect(() => {
    document.title = "HopOn - Find Pickup Games Nearby";
  }, []);
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-neutral-950 via-neutral-950 to-red-950/10">
      {/* Hero Section */}
      <div className="flex items-center justify-center px-6 py-12 sm:py-20 text-neutral-100 min-h-screen">
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

      {/* About Section */}
      <div className="px-6 py-16 sm:py-24 bg-gradient-to-b from-neutral-900/50 to-neutral-950">
        <div className="mx-auto max-w-4xl space-y-12">
          {/* Section Title */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-100">
              Why HopOn?
            </h2>
            <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
              Finding players for pickup sports shouldn't be difficult
            </p>
          </div>

          {/* Problem & Solution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Problem */}
            <div className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 sm:p-8 backdrop-blur-sm">
              <div className="text-4xl">❌</div>
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-100">The Problem</h3>
              <p className="text-neutral-400 leading-relaxed">
                Finding people to play sports with is frustrating. Most rely on scattered group chats, word-of-mouth, or generic community apps. New players get left out, games get cancelled, and coordination is a nightmare.
              </p>
              <ul className="space-y-2 text-neutral-400 text-sm">
                <li>✗ Inefficient coordination</li>
                <li>✗ No way to find local players</li>
                <li>✗ Scattered across multiple apps</li>
                <li>✗ Newcomers feel excluded</li>
              </ul>
            </div>

            {/* Solution */}
            <div className="space-y-4 rounded-2xl border border-red-500/30 bg-red-500/5 p-6 sm:p-8 backdrop-blur-sm">
              <div className="text-4xl">✨</div>
              <h3 className="text-xl sm:text-2xl font-bold text-neutral-100">Our Solution</h3>
              <p className="text-neutral-400 leading-relaxed">
                HopOn is a sport-specific platform built for pickup games. Find nearby courts, discover other players, organize matches, and build your local sports community—all in one place.
              </p>
              <ul className="space-y-2 text-neutral-400 text-sm">
                <li>✓ Location-based game discovery</li>
                <li>✓ Connect with local players</li>
                <li>✓ Sport-specific communities</li>
                <li>✓ Inclusive and welcoming</li>
              </ul>
            </div>
          </div>

          {/* What You Can Do */}
          <div className="space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-neutral-100 text-center">What You Can Do</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
                <div className="text-3xl">🎾</div>
                <h4 className="font-semibold text-neutral-100">Create Events</h4>
                <p className="text-sm text-neutral-400">Host pickup games at your favorite location and set the skill level</p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
                <div className="text-3xl">🔍</div>
                <h4 className="font-semibold text-neutral-100">Find Games</h4>
                <p className="text-sm text-neutral-400">Browse available events nearby with real-time locations and details</p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
                <div className="text-3xl">👤</div>
                <h4 className="font-semibold text-neutral-100">Build Profile</h4>
                <p className="text-sm text-neutral-400">Showcase your sports and skill level to connect with like-minded players</p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
                <div className="text-3xl">🗺️</div>
                <h4 className="font-semibold text-neutral-100">Explore Nearby</h4>
                <p className="text-sm text-neutral-400">Discover players and events in your neighborhood on an interactive map</p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
                <div className="text-3xl">⭐</div>
                <h4 className="font-semibold text-neutral-100">Build Community</h4>
                <p className="text-sm text-neutral-400">Connect with regulars, earn ratings, and grow your local sports network</p>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 space-y-3">
                <div className="text-3xl">🎯</div>
                <h4 className="font-semibold text-neutral-100">Play More</h4>
                <p className="text-sm text-neutral-400">Never miss a game—get instant access to events whenever you're free</p>
              </div>
            </div>
          </div>

          {/* Who is it for */}
          <div className="rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900/50 to-red-950/20 p-8 sm:p-12 space-y-4 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold text-neutral-100">Perfect For</h3>
            <p className="text-neutral-400 text-lg">
              Students • Young Professionals • Casual Athletes • Anyone who loves sports
            </p>
            <p className="text-neutral-500 text-sm">
              Whether you play basketball, tennis, badminton, or 80+ other sports—HopOn connects you with your people
            </p>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="px-6 py-12 sm:py-16 text-center space-y-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-neutral-100">
          Ready to Hop On?
        </h2>
        <p className="text-neutral-400 max-w-xl mx-auto">
          Join thousands of sports enthusiasts. Create an account, find a game, and start playing today.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-8 py-3 text-base font-semibold text-white transition hover:from-red-400 hover:to-red-500 shadow-lg hover:shadow-red-500/50"
          >
            Get Started
          </Link>
          <Link
            href="/discover"
            className="rounded-lg border border-neutral-700 px-8 py-3 text-base font-semibold text-neutral-200 transition hover:border-neutral-600 hover:bg-neutral-900"
          >
            Explore Games
          </Link>
        </div>
      </div>
    </div>
  );
}
