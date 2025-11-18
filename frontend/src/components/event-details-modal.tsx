"use client";

import React, { useState, useEffect } from "react";
import { X, MapPin, Users, Edit2, Trash2 } from "lucide-react";
import { HopOnEvent, HopOnUser, Api } from "@/lib/api";
import { getSportEmoji } from "@/lib/sports-emoji";
import { AVAILABLE_SPORTS } from "@/lib/sports";
import LocationPicker from "./location-picker";

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
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Log participants when they change for debugging
  useEffect(() => {
    console.log("[EventDetailsModal] Participants updated:", participants);
    participants.forEach((p) => {
      console.log("[EventDetailsModal] Participant:", { id: p.id, username: p.username, email: p.email });
    });
  }, [participants]);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    name: event.name,
    sport: event.sport,
    location: event.location,
    event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "",
    max_players: event.max_players,
    skill_level: event.skill_level || "",
    notes: event.notes || "",
  });

  const isHost = currentUser && event.host_user_id === currentUser.id;

  const handleSaveEdit = async () => {
    setIsSaving(true);
    setEditError(null);

    try {
      await Api.updateEvent(event.id, editForm);
      setIsEditing(false);
      onEventUpdated?.();
      onClose();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      name: event.name,
      sport: event.sport,
      location: event.location,
      event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : "",
      max_players: event.max_players,
      skill_level: event.skill_level || "",
      notes: event.notes || "",
    });
    setIsEditing(false);
    setEditError(null);
  };

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
            {/* Edit Error Message */}
            {editError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm text-red-200">
                {editError}
              </div>
            )}

            {isEditing ? (
              // EDIT MODE
              <div className="space-y-4">
                {/* Event Name */}
                <div>
                  <label className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide mb-2 block">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                    placeholder="Event name"
                  />
                </div>

                {/* Sport & Skill Level */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide mb-2 block">
                      Sport
                    </label>
                    <select
                      value={editForm.sport}
                      onChange={(e) => setEditForm({ ...editForm, sport: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select sport</option>
                      {AVAILABLE_SPORTS.map((sport) => (
                        <option key={sport} value={sport}>
                          {sport}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide mb-2 block">
                      Skill Level
                    </label>
                    <select
                      value={editForm.skill_level}
                      onChange={(e) => setEditForm({ ...editForm, skill_level: e.target.value })}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select level</option>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide mb-2 block">
                    Location
                  </label>
                  <LocationPicker
                    value={{ address: editForm.location }}
                    onChange={(location) => {
                      setEditForm({
                        ...editForm,
                        location: location.address,
                      });
                    }}
                  />
                </div>

                {/* Date & Time */}
                <div>
                  <label className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide mb-2 block">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={editForm.event_date}
                    onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Max Players */}
                <div>
                  <label className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide mb-2 block">
                    Max Players
                  </label>
                  <input
                    type="number"
                    min="2"
                    value={editForm.max_players}
                    onChange={(e) => setEditForm({ ...editForm, max_players: parseInt(e.target.value) || 2 })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wide mb-2 block">
                    Description (Optional)
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none h-20"
                    placeholder="Add notes about the event..."
                  />
                </div>
              </div>
            ) : (
              // READ-ONLY MODE
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
            )}

            {/* Participants Section */}
            <div className="border-t border-neutral-700 pt-6">
              <h3 className="text-sm sm:text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="size-5" />
                Players ({participants.length}/{event.max_players})
              </h3>
              {participants.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="relative rounded-lg border border-neutral-700 bg-neutral-800/40 hover:bg-neutral-800/60 backdrop-blur p-3 transition group"
                    >
                      {/* Avatar */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-lg font-bold uppercase text-white mx-auto mb-2">
                        {(participant.username || "?").slice(0, 1)}
                      </div>
                      
                      {/* Username */}
                      <p className="text-sm font-medium text-white text-center truncate">
                        {participant.username || "Unknown"}
                      </p>
                      
                      {/* Rating */}
                      {participant.rating && (
                        <p className="text-xs text-neutral-400 text-center mt-1">
                          ⭐ {participant.rating.toFixed(1)}
                        </p>
                      )}
                      
                      {/* Host Badge */}
                      {participant.id === event.host_user_id && (
                        <div className="absolute top-2 right-2">
                          <span className="text-xs font-semibold text-red-400 bg-red-500/20 border border-red-500/40 px-2 py-0.5 rounded-full">
                            Host
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-neutral-400 text-center py-6">No participants yet. Be the first to join!</p>
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
                {isEditing ? (
                  // SAVE/CANCEL BUTTONS
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm sm:text-base font-semibold py-2 sm:py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="flex items-center justify-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm sm:text-base font-semibold py-2 sm:py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  // EDIT/DELETE BUTTONS
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm sm:text-base font-semibold py-2 sm:py-3 rounded-lg transition"
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
