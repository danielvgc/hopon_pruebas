"use client";

import WebLayout from "@/components/web-layout";
import MapDisplay from "@/components/map-display";
import { EventCard } from "@/components/event-card";
import { EventDetailsModal } from "@/components/event-details-modal";
import { Api, type HopOnEvent, type HopOnUser } from "@/lib/api";
import Image from "next/image";
import * as React from "react";
import { FALLBACK_EVENTS } from "@/lib/fallback-data";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";

export default function HomePage() {
  React.useEffect(() => {
    document.title = "Home - HopOn";
  }, []);
  const router = useRouter();
  const [events, setEvents] = React.useState<HopOnEvent[]>([]);
  const [joinedEventIds, setJoinedEventIds] = React.useState<number[]>([]);
  const [pendingAction, setPendingAction] = React.useState<
    { id: number; type: "join" | "leave" } | null
  >(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [selectedSport, setSelectedSport] = React.useState<string>("All");
  const filterRef = React.useRef<HTMLDivElement | null>(null);
  const [hostedEvents, setHostedEvents] = React.useState<HopOnEvent[]>([]);
  const [selectedEventIdOnMap, setSelectedEventIdOnMap] = React.useState<number | undefined>();
  const [selectedEventForModal, setSelectedEventForModal] = React.useState<HopOnEvent | null>(null);
  const [eventParticipants, setEventParticipants] = React.useState<HopOnUser[]>([]);
  const { status, user } = useAuth();

  const loadData = React.useCallback(async () => {
    try {
      console.log("Loading nearby events...");
      // Pass user's location for distance-based sorting
      const params = user?.latitude && user?.longitude ? { lat: user.latitude, lng: user.longitude } : undefined;
      const nearby = await Api.nearbyEvents(params);
      console.log("Nearby events loaded (sorted by distance):", nearby);
      let joined: HopOnEvent[] = [];
      let hosted: HopOnEvent[] = [];
      if (status === "authenticated") {
        const mine = await Api.myEvents();
        joined = mine.joined || [];
        hosted = mine.hosted || [];
        setJoinedEventIds(joined.map((event) => event.id));
        setHostedEvents(hosted);
      } else {
        setJoinedEventIds([]);
        setHostedEvents([]);
      }
      setEvents(nearby);
      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to load events", error);
      setEvents([]);
      setJoinedEventIds([]);
      setHostedEvents([]);
      setErrorMessage("Couldn't load events. Check your connection and try again.");
    }
  }, [status, user?.latitude, user?.longitude]);

  const availableSports = React.useMemo(() => {
    const sportsSource =
      events.length > 0 ? events.map((event) => event.sport) : FALLBACK_EVENTS.map((event) => event.sport);
    const unique = Array.from(new Set(sportsSource));
    return ["All", ...unique];
  }, [events]);

  React.useEffect(() => {
    if (selectedSport !== "All" && !availableSports.includes(selectedSport)) {
      setSelectedSport("All");
    }
  }, [availableSports, selectedSport]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!filterRef.current) return;
      if (!filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  React.useEffect(() => {
    void loadData();

    // Set up interval to fetch events every 30 seconds for real-time updates
    const intervalId = setInterval(() => {
      void loadData();
    }, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [loadData]);

  async function handleViewEventDetails(event: HopOnEvent) {
    setSelectedEventForModal(event);
    try {
      // Fetch participants for this event
      const result = await Api.getEventParticipants(event.id);
      console.log("[Home] Event participants response:", result);
      console.log("[Home] Participants array:", result.participants);
      setEventParticipants(result.participants || []);
    } catch (error) {
      console.error("Failed to load event participants:", error);
      setEventParticipants([]);
    }
  }

  function handleCloseModal() {
    setSelectedEventForModal(null);
    setEventParticipants([]);
  }

  function handleEventDeleted() {
    handleCloseModal();
    void loadData();
  }

  async function handleJoin(eventId: number) {
    // If user is not authenticated, redirect to sign in
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    if (pendingAction !== null) {
      return;
    }
    setPendingAction({ id: eventId, type: "join" });
    try {
      await Api.joinEvent(eventId, {
        player_name: user?.username,
      });
      await loadData();
    } catch (error) {
      console.error("Failed to join event", error);
      setErrorMessage("Unable to join this event right now. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleLeave(eventId: number) {
    if (pendingAction !== null) {
      return;
    }
    setPendingAction({ id: eventId, type: "leave" });
    try {
      await Api.leaveEvent(eventId, {});
      await loadData();
    } catch (error) {
      console.error("Failed to leave event", error);
      setErrorMessage("Unable to leave this event right now. Please try again.");
    } finally {
      setPendingAction(null);
    }
  }

  const joinedSet = React.useMemo(() => new Set(joinedEventIds), [joinedEventIds]);
  const filteredEvents = React.useMemo(() => {
    if (selectedSport === "All") {
      return events;
    }
    return events.filter((event) => event.sport === selectedSport);
  }, [events, selectedSport]);
  const filteredFallbackEvents = React.useMemo(() => {
    if (selectedSport === "All") {
      return FALLBACK_EVENTS;
    }
    return FALLBACK_EVENTS.filter((event) => event.sport === selectedSport);
  }, [selectedSport]);
  const noEventsToShow =
    (events.length > 0 && filteredEvents.length === 0) ||
    (events.length === 0 && filteredFallbackEvents.length === 0);
  const nearbyCount = events.length > 0 ? events.length : FALLBACK_EVENTS.length;
  const joinedCount = joinedEventIds.length;
  const hostedCount = hostedEvents.length;

  return (
    <WebLayout>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
        <div className="h-40 sm:h-60 w-full bg-gradient-to-tr from-neutral-800 to-neutral-700" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-950/90" />
        <div className="absolute left-3 top-3 sm:left-6 sm:top-6 lg:left-10 lg:top-10 flex items-center gap-2 sm:gap-3">
          <Image 
            src="/logo.png" 
            alt="HopOn Logo" 
            width={48} 
            height={48} 
            className="h-8 w-8 sm:h-12 sm:w-12"
            priority
          />
          <div>
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-extrabold">HopOn</h2>
            <p className="text-xs sm:text-sm text-neutral-300">Find your game</p>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-2 sm:bottom-4">
          <div className="mx-3 sm:mx-6 lg:mx-10 grid grid-cols-3 items-start gap-2 sm:gap-6 rounded-lg sm:rounded-2xl border border-neutral-800 bg-neutral-900/80 p-3 sm:p-5 backdrop-blur">
            <Stat label="Nearby" value={nearbyCount.toString()} />
            <Stat label="Joined" value={joinedCount.toString()} />
            <Stat label="Hosted" value={hostedCount.toString()} />
          </div>
        </div>
      </div>

      {/* Map Section */}
      {events.length > 0 && (
        <div className="mt-12 sm:mt-16">
          <h3 className="mb-3 sm:mb-4 text-lg sm:text-2xl font-semibold">Events Map</h3>
          <MapDisplay
            events={events}
            selectedEventId={selectedEventIdOnMap}
            onEventSelect={(event) => setSelectedEventIdOnMap(event.id)}
            height="350px"
            center={
              user?.latitude && user?.longitude
                ? { lat: user.latitude, lng: user.longitude }
                : undefined
            }
            showUserLocation
          />
        </div>
      )}

      <div className="mt-16 sm:mt-24">
        <div className="mb-3 sm:mb-4 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-lg sm:text-2xl font-semibold">Nearby Events</h3>
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="rounded-lg sm:rounded-xl border border-neutral-800 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-neutral-300 hover:border-neutral-700 hover:text-white"
              aria-haspopup="true"
              aria-expanded={isFilterOpen}
            >
              Filter
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 z-20 mt-2 w-56 sm:w-64 rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/95 p-3 sm:p-4 text-xs sm:text-sm shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-100 text-sm">Filters</span>
                  <button
                    type="button"
                    className="text-xs text-neutral-400 hover:text-neutral-200"
                    onClick={() => setIsFilterOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <label className="mt-2 sm:mt-3 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Sport
                </label>
                <select
                  value={selectedSport}
                  onChange={(event) => setSelectedSport(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-900 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-neutral-100 focus:border-red-400 focus:outline-none"
                >
                  {availableSports.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="mt-2 sm:mt-3 text-xs font-semibold text-red-400 hover:text-red-300"
                  onClick={() => setSelectedSport("All")}
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="mb-3 sm:mb-4 rounded-lg border border-red-500/60 bg-red-500/10 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:gap-4 pb-8 lg:grid-cols-2">
          {noEventsToShow && (
            <div className="col-span-full rounded-lg sm:rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 px-4 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-neutral-400">
              No events match the selected filters yet. Try adjusting your filters or check back soon.
            </div>
          )}
          {!noEventsToShow &&
            (events.length === 0
              ? filteredFallbackEvents.map((event) => (
                  <EventCard key={event.id} {...event} />
                ))
              : filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    title={event.name}
                    sport={event.sport}
                    level={event.skill_level || undefined}
                    location={event.location}
                    datetime={event.event_date || undefined}
                    playersText={`${event.current_players}/${event.max_players} players`}
                    distanceKm={event.distance_km}
                    hostName={event.host?.username}
                    description={event.notes || undefined}
                    onViewDetails={() => handleViewEventDetails(event)}
                    onRightActionClick={
                      joinedSet.has(event.id)
                        ? () => handleLeave(event.id)
                        : () => handleJoin(event.id)
                    }
                    rightActionLabel={(() => {
                      const isPending = pendingAction?.id === event.id;
                      if (joinedSet.has(event.id)) {
                        return isPending && pendingAction?.type === "leave" ? "Leaving..." : "Leave";
                      }
                      return isPending && pendingAction?.type === "join" ? "Joining..." : "Join";
                    })()}
                    disabled={pendingAction?.id === event.id}
                  />
                )))}
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
            void loadData();
          }}
          participants={eventParticipants}
        />
      )}
    </WebLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center justify-start text-center">
      <div className="text-lg sm:text-2xl font-bold text-red-400">{value}</div>
      <div className="text-xs sm:text-sm text-neutral-300">{label}</div>
    </div>
  );
}
