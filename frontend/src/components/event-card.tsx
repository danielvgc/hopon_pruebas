"use client";

import { MapPin, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSportEmoji } from "@/lib/sports-emoji";

export type EventCardProps = {
  id?: number | string;
  title: string;
  sport: string;
  level?: string;
  location: string;
  datetime?: string; // ISO string
  playersText: string; // e.g. "6/10 players"
  distanceKm?: number | null;
  hostName?: string;
  description?: string | null;
  onJoin?: () => void;
  statusColorClass?: string; // optional top-right color
  rightActionLabel?: string;
  onRightActionClick?: () => void;
  disabled?: boolean;
};

export function EventCard({
  title,
  sport,
  level,
  location,
  datetime,
  playersText,
  distanceKm,
  hostName,
  description,
  onJoin,
  rightActionLabel = "Join",
  onRightActionClick,
  disabled = false,
}: EventCardProps) {
  const distance =
    typeof distanceKm === "number" ? `${distanceKm.toFixed(1)} km` : undefined;
  const dateDisplay = datetime
    ? new Date(datetime).toLocaleString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : undefined;

  return (
    <div className="rounded-lg sm:rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 sm:p-5 shadow-sm">
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="h-8 sm:h-10 w-8 sm:w-10 flex-shrink-0 rounded-full bg-neutral-800 flex items-center justify-center text-lg sm:text-xl">
          {getSportEmoji(sport)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-xl font-semibold leading-tight truncate">{title}</h3>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-neutral-300 truncate">
            {sport}
            {level ? <span> • {level}</span> : null}
          </p>
          {description && (
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-neutral-400 line-clamp-2">
              {(() => {
                const words = description.trim().split(/\s+/);
                const preview = words.slice(0, 20).join(" ");
                return words.length > 20 ? `${preview}…` : preview;
              })()}
            </p>
          )}
          <div className="mt-2.5 sm:mt-4 space-y-1 sm:space-y-2 text-neutral-300 text-xs sm:text-sm">
            <p className="flex items-center gap-2">
              <MapPin className="size-3 sm:size-4 opacity-70 flex-shrink-0" /> 
              <span className="truncate">
                {location}
                {distance ? ` (${distance})` : ""}
              </span>
            </p>
            {dateDisplay && (
              <p className="flex items-center gap-2">
                <Clock className="size-3 sm:size-4 opacity-70 flex-shrink-0" /> <span className="truncate">{dateDisplay}</span>
              </p>
            )}
            <p className="flex items-center gap-2">
              <Users className="size-3 sm:size-4 opacity-70 flex-shrink-0" /> {playersText}
            </p>
          </div>

          {hostName && (
            <p className="mt-2 sm:mt-4 text-xs sm:text-sm text-neutral-400 truncate">by {hostName}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-2">
          <button
            type="button"
            onClick={disabled ? undefined : onRightActionClick ?? onJoin}
            disabled={disabled || (!onRightActionClick && !onJoin)}
            className={cn(
              "rounded-lg sm:rounded-xl bg-red-500 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white whitespace-nowrap",
              "hover:bg-red-400 active:scale-[0.98]",
              disabled || (!onRightActionClick && !onJoin)
                ? "cursor-not-allowed opacity-50"
                : ""
            )}
          >
            {rightActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
