"use client";

import { MapPin, CalendarDays, Star, Check } from "lucide-react";

export type UserCardProps = {
  id?: number | string;
  name: string;
  handle?: string;
  bio?: string;
  location?: string;
  eventsCount?: number;
  tags?: string[];
  rating?: number;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
};

export function UserCard({
  name,
  handle,
  bio,
  location,
  eventsCount,
  tags = [],
  rating,
  isFollowing,
  onToggleFollow,
}: UserCardProps) {
  const canToggleFollow = typeof onToggleFollow === "function";
  return (
    <div className="rounded-lg sm:rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-5">
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="h-10 sm:h-12 w-10 sm:w-12 flex-shrink-0 rounded-full bg-neutral-800" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base sm:text-lg font-semibold">{name}</p>
              {handle && (
                <p className="text-xs sm:text-sm text-neutral-400 truncate">@{handle.replace(/^@/, "")}</p>
              )}
            </div>
            <button
              type="button"
              onClick={canToggleFollow ? onToggleFollow : undefined}
              disabled={!canToggleFollow}
              className={
                isFollowing
                  ? "rounded-lg sm:rounded-xl border border-neutral-700 px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0 whitespace-nowrap"
                  : "rounded-lg sm:rounded-xl border border-red-500/40 px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-red-400 disabled:cursor-not-allowed disabled:opacity-50 flex-shrink-0 whitespace-nowrap"
              }
            >
              {isFollowing ? (
                <span className="inline-flex items-center gap-1">
                  <Check className="size-3 sm:size-4" /> Following
                </span>
              ) : (
                "Follow"
              )}
            </button>
          </div>

          {bio && <p className="mt-1.5 sm:mt-3 text-xs sm:text-sm text-neutral-300 line-clamp-2">{bio}</p>}

          <div className="mt-2 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-neutral-300">
            {location && (
              <div className="flex items-center gap-1.5 sm:gap-2 truncate">
                <MapPin className="size-3 sm:size-4 opacity-70 flex-shrink-0" /> <span className="truncate">{location}</span>
              </div>
            )}
            {typeof eventsCount !== "undefined" && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CalendarDays className="size-3 sm:size-4 opacity-70 flex-shrink-0" /> {eventsCount} events
              </div>
            )}
          </div>

          <div className="mt-2 sm:mt-3 flex items-center gap-2 text-red-400">
            {typeof rating !== "undefined" && (
              <span className="inline-flex items-center gap-1 text-xs sm:text-sm">
                <Star className="size-3 sm:size-4 fill-red-500 text-red-500" /> {rating}
              </span>
            )}
          </div>

          {tags.length > 0 && (
            <div className="mt-2 sm:mt-4 flex flex-wrap gap-1.5 sm:gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-neutral-800 px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm text-neutral-300"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
