"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, CalendarDays, User, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { useState } from "react";

const nav = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/create", label: "Create", icon: Plus },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/profile", label: "Profile", icon: User },
];

export default function TopNav() {
  const pathname = usePathname();
  const { status, user, logout } = useAuth();
  const isAuthenticated = status === "authenticated" && !!user;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2 hover:opacity-80 transition">
          <Image 
            src="/logo.png" 
            alt="HopOn Logo" 
            width={32} 
            height={32} 
            className="h-8 w-8"
            priority
          />
          <span className="hidden sm:inline text-xl font-semibold">HopOn</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                  active
                    ? "bg-neutral-900 text-red-400"
                    : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="ml-2 flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <div className="hidden items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-sm text-neutral-200 lg:flex">
                  <div className="flex size-6 items-center justify-center rounded-full bg-red-500/80 text-xs font-semibold uppercase text-white">
                    {user.username.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user.username}</span>
                </div>
                <button
                  onClick={() => logout().catch(() => undefined)}
                  className="rounded-xl border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-red-400 hover:text-red-300"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-neutral-500 hover:text-neutral-100"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-xl border border-red-500/40 px-3 py-1.5 text-sm font-semibold text-red-400 hover:border-red-400 hover:text-red-300"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-neutral-900"
        >
          {mobileMenuOpen ? (
            <X className="size-5 text-neutral-300" />
          ) : (
            <Menu className="size-5 text-neutral-300" />
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-800 bg-neutral-950">
          <div className="px-6 py-4 space-y-3">
            {/* Navigation Items */}
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm",
                    active
                      ? "bg-neutral-900 text-red-400"
                      : "text-neutral-300 hover:bg-neutral-900 hover:text-white"
                  )}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* User Info and Auth Buttons */}
            <div className="border-t border-neutral-800 pt-3 mt-3">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-neutral-900/50 mb-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-red-500/80 text-xs font-semibold uppercase text-white flex-shrink-0">
                      {user.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.username}</p>
                      <p className="text-xs text-neutral-400">Account</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout().catch(() => undefined);
                      handleNavClick();
                    }}
                    className="w-full rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-red-400 hover:text-red-300 transition"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={handleNavClick}
                    className="block text-center rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500 hover:text-neutral-100 mb-2 transition"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={handleNavClick}
                    className="block text-center rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 hover:border-red-400 hover:text-red-300 transition"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
