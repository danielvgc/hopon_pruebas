"use client";

import React, { useState } from "react";
import { X, MapPin, Clock, Users, Edit2, Trash2, Share2 } from "lucide-react";
import { HopOnEvent, HopOnUser, Api } from "@/lib/api";
import { getSportEmoji } from "@/lib/sports-emoji";

interface EventDetailsModalProps {
  event: HopOnEvent;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: HopOnUser | null;
  onEventDeleted?: () => void;
  onEventUpdated?: () => void;
  participants: HopOnUser[];
}

export function EventDetailsModal({
  event,
  isOpen,
  onClose,
  currentUser,
  onEventDeleted,
  onEventUpdated,
  participants,
}: EventDetailsModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isHost = currentUser && event.host_user_id === currentUser.id;

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this event? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await Api.deleteEvent(event.id);
      onEventDeleted?.();
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-neutral-700 rounded-lg sm:rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-neutral-900 border-b border-neutral-700 p-4 sm:p-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="h-10 sm:h-12 w-10 sm:w-12 flex-shrink-0 rounded-full bg-neutral-800 flex items-center justify-center text-2xl">
                {getSportEmoji(event.sport)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
                  {event.name}
                </h2>
                <p className="text-sm sm:text-base text-red-500 font-semibold mt-1">
                  {event.sport}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-neutral-400 hover:text-white transition"
              aria-label="Close modal"
            >
              <X className="size-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* Event Details */}
            <div className="space-y-4">
              {/* Sport & Level */}
              <div className="grid grid-cols-2 gap-4">
                {event.skill_level && (
                  <div>
                    <p className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide">
                      Skill Level
                    </p>
                    <p className="mt-1 text-sm sm:text-base text-yellow-400 font-medium">
                      {event.skill_level}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide">
                    Players
                  </p>
                  <p className="mt-1 text-sm sm:text-base text-white font-medium">
                    {event.current_players}/{event.max_players}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide mb-2">
                  Location
                </p>
                <p className="text-sm sm:text-base text-neutral-200 mb-2">
                  {event.location}
                </p>
                {event.latitude && event.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${event.latitude},${event.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs sm:text-sm text-red-500 hover:text-red-400 font-semibold"
                  >
                    <MapPin className="size-4" />
                    View on Google Maps
                  </a>
                )}
              </div>

              {/* Date & Time */}
              {event.event_date && (
                <div>
                  <p className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide mb-2">
                    Date & Time
                  </p>
                  <p className="text-sm sm:text-base text-neutral-200">
                    {new Date(event.event_date).toLocaleDateString()} at{" "}
                    {new Date(event.event_date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}

              {/* Description */}
              {event.notes && (
                <div>
                  <p className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide mb-2">
                    Description
                  </p>
                  <p className="text-sm sm:text-base text-neutral-300 whitespace-pre-wrap">
                    {event.notes}
                  </p>
                </div>
              )}

              {/* Host */}
              {event.host && (
                <div>
                  <p className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide mb-2">
                    Host
                  </p>
                  <p className="text-sm sm:text-base text-neutral-200">
                    {event.host.username}
                  </p>
                </div>
              )}
            </div>

            {/* Participants Section */}
            <div className="border-t border-neutral-700 pt-6">
              <h3 className="text-sm sm:text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Users className="size-5" />
                Participants ({participants.length})
              </h3>
              {participants.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center justify-between bg-neutral-800/40 rounded-lg p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {participant.username}
                        </p>
                        {participant.rating && (
                          <p className="text-xs text-neutral-400">
                            Rating: {participant.rating.toFixed(1)}
                          </p>
                        )}
                      </div>
                      {participant.id === event.host_user_id && (
                        <span className="text-xs font-semibold text-red-500 bg-red-500/20 px-2 py-1 rounded">
                          Host
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">No participants yet.</p>
              )}
            </div>

            {/* Error Message */}
            {deleteError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm text-red-200">
                {deleteError}
              </div>
            )}

            {/* Host Actions */}
            {isHost && (
              <div className="border-t border-neutral-700 pt-6 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm sm:text-base font-semibold py-2 sm:py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isDeleting}
                  >
                    <Edit2 className="size-4" />
                    Edit Event
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm sm:text-base font-semibold py-2 sm:py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="size-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
