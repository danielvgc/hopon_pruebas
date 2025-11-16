"use client";

import WebLayout from "@/components/web-layout";
import { EventCard } from "@/components/event-card";
import { EventDetailsModal } from "@/components/event-details-modal";
import * as React from "react";
import { Api, type HopOnEvent, type HopOnUser } from "@/lib/api";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

type TabKey = "joined" | "hosted";

export default function EventsPage() {
  React.useEffect(() => {
    document.title = "Events - HopOn";
  }, []);

  const { status, guestTokens, clearGuestToken, user } = useAuth();
  const isAuthenticated = status === "authenticated";
  const router = useRouter();

  const [tab, setTab] = React.useState<TabKey>("joined");
  const [joined, setJoined] = React.useState<HopOnEvent[]>([]);
  const [hosted, setHosted] = React.useState<HopOnEvent[]>([]);
  const [actionEventId, setActionEventId] = React.useState<number | null>(null);
  const [selectedEventForModal, setSelectedEventForModal] = React.useState<HopOnEvent | null>(null);
  const [eventParticipants, setEventParticipants] = React.useState<HopOnUser[]>([]);

  const loadMyEvents = React.useCallback(async () => {
    try {
      if (isAuthenticated) {
        const res = await Api.myEvents();
        setJoined(res.joined || []);
        setHosted(res.hosted || []);
      } else {
        const nearby = await Api.nearbyEvents();
        const joinedIds = new Set(Object.keys(guestTokens).map((id) => Number(id)));
        setJoined(nearby.filter((event) => joinedIds.has(event.id)));
        setHosted([]);
      }
    } catch (error) {
      console.error("Failed to load events", error);
      setJoined([]);
      setHosted([]);
    }
  }, [guestTokens, isAuthenticated]);

  React.useEffect(() => {
    void loadMyEvents();
  }, [loadMyEvents]);

  function handleViewEventDetails(event: HopOnEvent) {
    setSelectedEventForModal(event);
    setEventParticipants([]);
  }

  function handleCloseModal() {
    setSelectedEventForModal(null);
    setEventParticipants([]);
  }

  function handleEventDeleted() {
    handleCloseModal();
    void loadMyEvents();
  }

  async function handleLeave(eventId: number) {
    if (actionEventId !== null) {
      return;
    }
    setActionEventId(eventId);
    try {
      if (isAuthenticated) {
        await Api.leaveEvent(eventId, {});
      } else {
        const token = guestTokens[eventId];
        if (!token) {
          console.warn("No guest token found for event", eventId);
          return;
        }
        await Api.leaveEvent(eventId, { guest_token: token });
        clearGuestToken(eventId);
      }
      await loadMyEvents();
    } catch (error) {
      console.error("Failed to leave event", error);
    } finally {
      setActionEventId(null);
    }
  }

  const stats = [
    { label: "This Month", value: "12" },
    { label: "Upcoming", value: "3" },
    { label: "Total Events", value: "156" },
  ];

  const items = tab === "joined" ? joined : hosted;
  const hasEvents = items.length > 0;

  // Calculate stats dynamically
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const thisMonthEvents = joined.filter((e) => {
    if (!e.event_date) return false;
    const eventDate = new Date(e.event_date);
    return eventDate >= thisMonthStart && eventDate <= thisMonthEnd;
  }).length;

  const upcomingEvents = joined.filter((e) => {
    if (!e.event_date) return false;
    return new Date(e.event_date) > now;
  }).length;

  const totalEvents = joined.length + hosted.length;

  return (
    <WebLayout title="My Events">
      {!isAuthenticated && (
        <div className="mb-6 rounded-2xl border border-amber-600/50 bg-amber-500/10 p-6 text-center">
          <h2 className="mb-2 text-lg sm:text-xl font-bold text-amber-400">Authentication Required</h2>
          <p className="mb-4 text-sm sm:text-base text-amber-100/80">You need to be logged in to view your events.</p>
          <div className="flex gap-3 justify-center flex-col sm:flex-row">
            <button
              onClick={() => router.push("/signup")}
              className="rounded-lg sm:rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 sm:py-3 font-semibold text-white text-sm sm:text-base transition"
            >
              Sign Up
            </button>
            <button
              onClick={() => router.push("/login")}
              className="rounded-lg sm:rounded-xl bg-green-600 hover:bg-green-500 px-4 py-2 sm:py-3 font-semibold text-white text-sm sm:text-base transition"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      <div style={{ opacity: isAuthenticated ? 1 : 0.5, pointerEvents: isAuthenticated ? "auto" : "none" }}>
      <div className="mt-2 flex gap-2 rounded-2xl bg-neutral-900/60 p-1">
        <button
          className={
            tab === "joined"
              ? "flex-1 rounded-xl bg-red-500 px-4 py-2 text-white"
              : "flex-1 rounded-xl px-4 py-2 text-neutral-300"
          }
          onClick={() => setTab("joined")}
        >
          Joined ({joined.length})
        </button>
        <button
          className={
            tab === "hosted"
              ? "flex-1 rounded-xl bg-red-500 px-4 py-2 text-white"
              : "flex-1 rounded-xl px-4 py-2 text-neutral-300"
          }
          onClick={() => setTab("hosted")}
        >
          Hosted ({hosted.length})
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 text-center">
        {stats.map((s) => {
          const value =
            s.label === "This Month"
              ? thisMonthEvents.toString()
              : s.label === "Upcoming"
                ? upcomingEvents.toString()
                : s.label === "Total Events"
                  ? totalEvents.toString()
                  : s.value;
          return (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-red-400">{value}</div>
              <div className="text-sm text-neutral-300">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 pb-8 lg:grid-cols-2">
        {isAuthenticated && !hasEvents && (
          <div className="col-span-full rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 px-6 py-8 text-center text-sm text-neutral-400">
            No events yet. Join a game or create one to see it here.
          </div>
        )}
        {items.map((e) => {
          const isCurrent = actionEventId === e.id;
          const isJoinedTab = tab === "joined";
          const isHost = !!(user && e.host_user_id === user.id);
          
          return (
            <EventCard
              key={e.id}
              title={e.name}
              sport={e.sport}
              location={e.location}
              datetime={e.event_date || undefined}
              playersText={`${e.current_players}/${e.max_players}`}
              hostName={e.host?.username}
              description={e.notes || undefined}
              onViewDetails={() => handleViewEventDetails(e)}
              rightActionLabel={
                isJoinedTab && !isHost
                  ? isCurrent
                    ? "Leaving..."
                    : "Leave"
                  : "View"
              }
              onRightActionClick={isJoinedTab && !isHost ? () => handleLeave(e.id) : undefined}
              disabled={isCurrent || (isJoinedTab && isHost)}
            />
          );
        })}
      </div>
      </div>

      {/* Event Details Modal */}
      {selectedEventForModal && (
        <EventDetailsModal
          event={selectedEventForModal}
          isOpen={!!selectedEventForModal}
          onClose={handleCloseModal}
          currentUser={user}
          onEventDeleted={handleEventDeleted}
          onEventUpdated={() => {
            handleCloseModal();
            void loadMyEvents();
          }}
          participants={eventParticipants}
        />
      )}
    </WebLayout>
  );
}
