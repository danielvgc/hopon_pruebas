"use client";

import WebLayout from "@/components/web-layout";
import { EventCard } from "@/components/event-card";
import { EventDetailsModal } from "@/components/event-details-modal";
import * as React from "react";
import { Api, type HopOnEvent, type HopOnUser } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

type TabKey = "joined" | "hosted";

export default function EventsPage() {
  React.useEffect(() => {
    document.title = "Events - HopOn";
  }, []);

  const [tab, setTab] = React.useState<TabKey>("joined");
  const [joined, setJoined] = React.useState<HopOnEvent[]>([]);
  const [hosted, setHosted] = React.useState<HopOnEvent[]>([]);
  const [actionEventId, setActionEventId] = React.useState<number | null>(null);
  const [selectedEventForModal, setSelectedEventForModal] = React.useState<HopOnEvent | null>(null);
  const [eventParticipants, setEventParticipants] = React.useState<HopOnUser[]>([]);
  const { status, guestTokens, clearGuestToken, user } = useAuth();
  const isAuthenticated = status === "authenticated";

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

  return (
    <WebLayout title="My Events">
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
            s.label === "Upcoming"
              ? hosted.length.toString()
              : s.label === "Total Events"
                ? (hosted.length + joined.length).toString()
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
                isJoinedTab
                  ? isCurrent
                    ? "Leaving..."
                    : "Leave"
                  : "View"
              }
              onRightActionClick={isJoinedTab ? () => handleLeave(e.id) : undefined}
              disabled={isCurrent || !isJoinedTab}
            />
          );
        })}
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
