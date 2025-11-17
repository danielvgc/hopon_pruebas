"use client";

import WebLayout from "@/components/web-layout";
import MapDisplay from "@/components/map-display";
import { UserCard } from "@/components/user-card";
import { EventCard } from "@/components/event-card";
import { EventDetailsModal } from "@/components/event-details-modal";
import { Search } from "lucide-react";
import { Api, type HopOnEvent, type HopOnUser } from "@/lib/api";
import { FALLBACK_EVENTS, FALLBACK_PLAYERS } from "@/lib/fallback-data";
import * as React from "react";
import { useAuth } from "@/context/auth-context";

type PlayerDisplay = {
  id: string;
  backendId?: number;
  name: string;
  handle: string;
  rating?: number;
  bio?: string | null;
  location?: string | null;
  eventsCount?: number;
  tags: string[];
  tagsLower: string[];
  isFollowing?: boolean;
};

type EventDisplay = {
  id: string;
  title: string;
  sport: string;
  level?: string | null;
  location: string;
  datetime?: string | null;
  playersText: string;
  distanceKm?: number | null;
  hostName?: string | null;
  tagsLower: string[];
  description?: string | null;
  event?: HopOnEvent; // Reference to actual event for modal
};

const DEFAULT_FILTER = "Nearby";

// Discover page component
export default function DiscoverPage() {
  React.useEffect(() => {
    document.title = "Discover Games - HopOn";
  }, []);

  const [query, setQuery] = React.useState("");
  const [players, setPlayers] = React.useState<HopOnUser[]>([]);
  const [events, setEvents] = React.useState<HopOnEvent[]>([]);
  const [activeFilter, setActiveFilter] = React.useState(DEFAULT_FILTER);
  const [playerOverrides, setPlayerOverrides] = React.useState<Record<string, boolean>>({});
  const [selectedEventId, setSelectedEventId] = React.useState<number | undefined>();
  const [selectedEventForModal, setSelectedEventForModal] = React.useState<HopOnEvent | null>(null);
  const [eventParticipants, setEventParticipants] = React.useState<HopOnUser[]>([]);
  const { user } = useAuth();

  // Fetch players - same for everyone
  React.useEffect(() => {
    Api.playersNearby().then(setPlayers).catch(() => setPlayers([]));
  }, []);

  // Fetch events - same for everyone
  React.useEffect(() => {
    Api.nearbyEvents().then(setEvents).catch(() => setEvents([]));
  }, []);

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
    Api.nearbyEvents().then(setEvents).catch(() => setEvents([]));
  }

  const playerItems = React.useMemo<PlayerDisplay[]>(() => {
    const apiPlayers = players.map((player) => {
        // Normalize sports: ensure it's always a clean array of strings
        let sports: string[] = [];
        if (Array.isArray(player.sports)) {
          sports = player.sports
            .filter((sport): sport is string => typeof sport === 'string' && Boolean(sport))
            .map((sport: string) => sport.trim())
            .filter((sport: string) => sport.length > 0);
        } else if (typeof player.sports === 'string') {
          // If it's a string, split by comma
          sports = (player.sports as string)
            .split(',')
            .map((sport: string) => sport.trim())
            .filter((sport: string) => sport.length > 0);
        }
        
        const tagsLower = sports.map((sport) => sport.toLowerCase());
        const eventsCount = player.eventsCount ?? player.events_count ?? undefined;
        const isFollowing = Boolean(
          player.is_following ?? player.isFollowing ?? false
        );
        return {
          id: `api-player-${player.id}`,
          backendId: player.id,
          name: player.username,
          handle: player.username,
          rating: typeof player.rating === "number" ? player.rating : undefined,
          bio: player.bio,
          location: player.location,
          eventsCount,
          tags: sports,
          tagsLower,
          isFollowing,
        };
      });

      const seenHandles = new Set(apiPlayers.map((player) => player.handle.toLowerCase()));

    const fallbackPlayers = FALLBACK_PLAYERS.filter(
      (player) => !seenHandles.has(player.handle.toLowerCase())
        ).map((player, index) => ({
          id: `fallback-player-${index}`,
          backendId: undefined,
          name: player.name,
          handle: player.handle,
          rating: player.rating,
          bio: player.bio,
          location: player.location,
          eventsCount: player.eventsCount,
          tags: player.tags,
          tagsLower: player.tags.map((tag) => tag.toLowerCase()),
          isFollowing: player.isFollowing ?? false,
        }));

    return [...apiPlayers, ...fallbackPlayers].map((player) => ({
      ...player,
      isFollowing: playerOverrides[player.id] ?? player.isFollowing ?? false,
    }));
  }, [players, playerOverrides]);

  const eventItems = React.useMemo<EventDisplay[]>(() => {
    const seenTitles = new Set<string>();

    const normalizedEvents = events.map((event) => {
      const title = event.name;
      const normalizedTitle = title.toLowerCase();
      seenTitles.add(normalizedTitle);
      return {
        id: `api-event-${event.id}`,
        title,
        sport: event.sport,
        level: event.skill_level,
        location: event.location,
        datetime: event.event_date,
        playersText: `${event.current_players}/${event.max_players} players`,
        distanceKm: event.distance_km ?? undefined,
        hostName: event.host?.username ?? null,
        description: event.notes ?? null,
        tagsLower: [event.sport.toLowerCase()],
        event, // Include reference to actual event
      };
    });

    const fallbackEvents = FALLBACK_EVENTS.filter(
      (event) => !seenTitles.has(event.title.toLowerCase())
    ).map((event) => ({
      id: event.id,
      title: event.title,
      sport: event.sport,
      level: event.level,
      location: event.location,
      datetime: event.datetime,
      playersText: event.playersText,
      distanceKm: event.distanceKm,
      hostName: event.hostName ?? null,
      description: event.description ?? null,
      tagsLower: [event.sport.toLowerCase()],
    }));

    return [...normalizedEvents, ...fallbackEvents];
  }, [events]);

  const filters = React.useMemo(() => {
    const sportSet = new Set<string>();
    playerItems.forEach((player) => {
      player.tags.forEach((tag) => {
        if (typeof tag === 'string' && tag.trim().length > 0) {
          sportSet.add(tag.trim());
        }
      });
    });
    eventItems.forEach((event) => {
      if (typeof event.sport === 'string' && event.sport.trim().length > 0) {
        sportSet.add(event.sport.trim());
      }
    });
    
    // Build the filters array - ensure it's always an array of strings only
    const sportsArray = Array.from(sportSet)
      .sort((a, b) => a.localeCompare(b))
      .filter((sport) => typeof sport === 'string' && sport.length > 0);
    
    const result = [DEFAULT_FILTER, ...sportsArray];
    
    // Safety check: ensure all elements are strings
    return result.filter((item) => typeof item === 'string' && item.length > 0) as string[];
  }, [playerItems, eventItems]);

  React.useEffect(() => {
    if (!filters.includes(activeFilter)) {
      setActiveFilter(DEFAULT_FILTER);
    }
  }, [filters, activeFilter]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredPlayers = React.useMemo(() => {
    return playerItems.filter((player) => {
      const matchesFilter =
        activeFilter === DEFAULT_FILTER ||
        player.tagsLower.includes(activeFilter.toLowerCase());

      if (!matchesFilter) {
        return false;
      }

      if (normalizedQuery.length === 0) {
        return true;
      }

      const haystacks = [
        player.name,
        player.handle,
        player.bio ?? undefined,
        player.location ?? undefined,
      ]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.toLowerCase());

      const matchInText = haystacks.some((value) => value.includes(normalizedQuery));
      const matchInTags = player.tagsLower.some((tag) => tag.includes(normalizedQuery));

      return matchInText || matchInTags;
    });
  }, [playerItems, activeFilter, normalizedQuery]);

  const filteredEvents = React.useMemo(() => {
    return eventItems.filter((event) => {
      const matchesFilter =
        activeFilter === DEFAULT_FILTER ||
        event.tagsLower.includes(activeFilter.toLowerCase());

      if (!matchesFilter) {
        return false;
      }

      if (normalizedQuery.length === 0) {
        return true;
      }

      const haystacks = [
        event.title,
        event.sport,
        event.level ?? undefined,
        event.location,
        event.hostName ?? undefined,
      ]
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.toLowerCase());

      return haystacks.some((value) => value.includes(normalizedQuery));
    });
  }, [eventItems, activeFilter, normalizedQuery]);

  React.useEffect(() => {
    setPlayerOverrides({});
  }, [players]);

  const handleFollowToggle = React.useCallback(
    async (player: PlayerDisplay) => {
      if (!player.backendId) {
        return;
      }
      const currentlyFollowing = player.isFollowing ?? false;
      try {
        if (currentlyFollowing) {
          await Api.unfollow(player.backendId, player.backendId);
        } else {
          await Api.follow(player.backendId, player.backendId);
        }
      } catch (error) {
        console.error("Failed to toggle follow", error);
        return;
      }
      setPlayerOverrides((prev) => ({
        ...prev,
        [player.id]: !currentlyFollowing,
      }));
    },
    []
  );

  return (
    <WebLayout title="Discover">
      <div className="space-y-3 sm:space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search players, sports, locations..."
            className="w-full rounded-lg sm:rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 pl-9 sm:pl-11 text-xs sm:text-sm text-neutral-100 placeholder:text-neutral-500"
          />
          <Search className="absolute left-3 top-1/2 size-4 sm:size-5 -translate-y-1/2 text-neutral-500" />
        </div>

        {/* Sport Filter - Dropdown Selector */}
        <div className="w-full">
          <label htmlFor="sport-filter" className="block text-xs font-medium text-neutral-300 mb-2">
            Filter by Sport
          </label>
          <select
            id="sport-filter"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs sm:text-sm text-neutral-100 focus:border-red-400 focus:outline-none cursor-pointer"
          >
            {Array.isArray(filters) && filters.length > 0 && filters.every(f => typeof f === 'string') ? (
              filters.map((filter) => {
                const filterStr = String(filter).trim();
                return filterStr ? (
                  <option key={`select-${filterStr}`} value={filterStr}>
                    {filterStr}
                  </option>
                ) : null;
              })
            ) : (
              <option value="Nearby">Nearby</option>
            )}
          </select>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 space-y-6 sm:space-y-10 pb-10">
        {/* Map Section */}
        {events.length > 0 && (
          <section>
            <div className="mb-2 sm:mb-3">
              <h2 className="text-base sm:text-xl font-semibold">Event Map</h2>
            </div>
            <MapDisplay
              events={events}
              selectedEventId={selectedEventId}
              onEventSelect={(event) => setSelectedEventId(event.id)}
              height="300px"
              center={
                user?.latitude && user?.longitude
                  ? { lat: user.latitude, lng: user.longitude }
                  : undefined
              }
              showUserLocation
            />
          </section>
        )}

        <section>
          <div className="mb-2 sm:mb-3 flex items-center justify-between">
            <h2 className="text-base sm:text-xl font-semibold">Players</h2>
            <span className="text-xs sm:text-sm text-neutral-400">{filteredPlayers.length} result(s)</span>
          </div>
          {filteredPlayers.length === 0 ? (
            <div className="rounded-lg sm:rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 px-4 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-neutral-400">
              No players match the current filters. Try a different sport or search term.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
              {filteredPlayers.map((player) => (
                <UserCard
                  key={player.id}
                  name={player.name}
                  handle={player.handle}
                  rating={player.rating}
                  bio={player.bio ?? undefined}
                  location={player.location ?? undefined}
                  eventsCount={player.eventsCount}
                  tags={player.tags}
                  isFollowing={player.isFollowing}
                  onToggleFollow={
                    player.backendId ? () => handleFollowToggle(player) : undefined
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-2 sm:mb-3 flex items-center justify-between">
            <h2 className="text-base sm:text-xl font-semibold">Games & Events</h2>
            <span className="text-xs sm:text-sm text-neutral-400">{filteredEvents.length} result(s)</span>
          </div>
          {filteredEvents.length === 0 ? (
            <div className="rounded-lg sm:rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 px-4 sm:px-6 py-6 sm:py-8 text-center text-xs sm:text-sm text-neutral-400">
              No events match the current filters. Try adjusting your sport or search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  title={event.title}
                  sport={event.sport}
                  level={event.level ?? undefined}
                  location={event.location}
                  datetime={event.datetime ?? undefined}
                  playersText={event.playersText}
                  distanceKm={event.distanceKm ?? undefined}
                  hostName={event.hostName ?? undefined}
                  description={event.description ?? undefined}
                  onViewDetails={event.event ? () => handleViewEventDetails(event.event!) : undefined}
                  rightActionLabel="View"
                />
              ))}
            </div>
          )}
        </section>
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
            Api.nearbyEvents().then(setEvents).catch(() => setEvents([]));
          }}
          participants={eventParticipants}
        />
      )}
    </WebLayout>
  );
}
