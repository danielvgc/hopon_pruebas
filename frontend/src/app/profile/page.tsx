"use client";

import WebLayout from "@/components/web-layout";
import LocationPicker from "@/components/location-picker";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Api, API_BASE_URL, type HopOnEvent } from "@/lib/api";
import DeleteAccountModal from "@/components/delete-account-modal";
import { useEffect, useState } from "react";
import { Calendar, Users, UserCheck, Trophy, Clock, MapPin, X, Check, AlertCircle, Trash2, Activity } from "lucide-react";
import { useCallback } from "react";

// List of available sports
const AVAILABLE_SPORTS = [
  "Basketball",
  "Football",
  "Soccer",
  "Tennis",
  "Volleyball",
  "Baseball",
  "Badminton",
  "Hockey",
  "Rugby",
  "Pickleball",
  "Table Tennis",
  "Squash",
];

export default function ProfilePage() {
  useEffect(() => {
    document.title = "Profile - HopOn";
  }, []);
  
  const { status, user, logout, accessToken, setUser } = useAuth();
  const router = useRouter();
  const isAuthenticated = status === "authenticated";
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Profile stats and activity state
  const [stats, setStats] = useState({
    gamesPlayed: 0,
    following: 0,
    followers: 0,
    upcomingGames: 0,
  });
  const [recentActivity, setRecentActivity] = useState<HopOnEvent[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<HopOnEvent[]>([]);
  
  // Helper function to normalize sports data
  const normalizeSports = (sports: string[] | string | null | undefined): string[] => {
    if (Array.isArray(sports)) {
      return sports;
    }
    if (typeof sports === 'string' && sports) {
      return sports.split(',').map((s) => s.trim()).filter((s) => s);
    }
    return [];
  };

  // Helper function to format join date as "Month Year"
  const formatJoinDate = (createdAt: string | null | undefined): string => {
    if (!createdAt) return "Unknown";
    try {
      const date = new Date(createdAt);
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return "Unknown";
    }
  };

  // Helper function to format event date
  const formatEventDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "No date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return "Invalid date";
    }
  };

  // Helper function to check if event is in future
  const isUpcomingEvent = (eventDate: string | null | undefined): boolean => {
    if (!eventDate) return false;
    try {
      return new Date(eventDate) > new Date();
    } catch {
      return false;
    }
  };

  // Fetch profile stats and activity
  const fetchProfileData = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      // Fetch user's events
      const myEventsData = await Api.myEvents();
      const allJoinedEvents = myEventsData.joined || [];
      const allHostedEvents = myEventsData.hosted || [];
      
      // Deduplicate events by ID (in case user hosted and joined the same event)
      const eventMap = new Map<number, HopOnEvent>();
      allJoinedEvents.forEach((event) => eventMap.set(event.id, event));
      allHostedEvents.forEach((event) => eventMap.set(event.id, event));
      const allUniqueEvents = Array.from(eventMap.values());
      
      // Separate upcoming and past events
      const upcoming = allUniqueEvents
        .filter((event) => isUpcomingEvent(event.event_date))
        .sort((a, b) => new Date(a.event_date || 0).getTime() - new Date(b.event_date || 0).getTime());
      
      const recent = allUniqueEvents
        .sort((a, b) => new Date(b.event_date || 0).getTime() - new Date(a.event_date || 0).getTime())
        .slice(0, 5); // Last 5 events
      
      setUpcomingGames(upcoming);
      setRecentActivity(recent);
      
      // Calculate stats - use unique events count for gamesPlayed
      setStats({
        gamesPlayed: allUniqueEvents.length,
        following: user.is_following ? 1 : 0, // Will be updated properly if we have follower data
        followers: 0, // Will be updated if we fetch follower data
        upcomingGames: upcoming.length,
      });
    } catch (error) {
      console.error("Failed to fetch profile data:", error);
    }
  }, [isAuthenticated, user]);

  // Fetch profile data on mount and set up auto-refresh
  useEffect(() => {
    if (isAuthenticated) {
      fetchProfileData();
      
      // Auto-refresh every 30 seconds
      const intervalId = setInterval(() => {
        fetchProfileData();
      }, 30000);
      
      return () => clearInterval(intervalId);
    }
  }, [isAuthenticated, fetchProfileData]);

  const [editData, setEditData] = useState({
    username: user?.username || "",
    bio: user?.bio || "",
    location: { 
      address: user?.location || "", 
      lat: user?.latitude, 
      lng: user?.longitude 
    },
    sports: normalizeSports(user?.sports),
  });
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Sync editData when modal opens (only once when modal opens)
  useEffect(() => {
    if (isEditModalOpen && user) {
      setEditData({
        username: user.username || "",
        bio: user.bio || "",
        location: { 
          address: user.location || "", 
          lat: user.latitude, 
          lng: user.longitude 
        },
        sports: normalizeSports(user.sports),
      });
      setUsernameAvailable(null);
      console.log("[Profile] Modal opened, synced editData:", { username: user.username, bio: user.bio, sports: normalizeSports(user.sports) });
    }
  }, [isEditModalOpen]);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
    
    // Check username availability when username field changes
    if (name === "username") {
      checkUsernameAvailability(value);
    }
  };

  const handleSportToggle = (sport: string) => {
    setEditData((prev) => {
      const currentSports = Array.isArray(prev.sports) ? prev.sports : [];
      if (currentSports.includes(sport)) {
        return { ...prev, sports: currentSports.filter((s) => s !== sport) };
      } else {
        return { ...prev, sports: [...currentSports, sport] };
      }
    });
  };

  const checkUsernameAvailability = async (username: string) => {
    console.log("[Profile] Checking username availability for:", username);
    
    if (!username || username === user?.username) {
      console.log("[Profile] Username is empty or same as current, skipping check");
      setUsernameAvailable(null);
      return;
    }

    if (username.length < 3) {
      console.log("[Profile] Username too short");
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    try {
      const url = `${API_BASE_URL}/auth/username-available?username=${encodeURIComponent(username)}`;
      console.log("[Profile] Fetching from:", url);
      
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      const data = await response.json();
      console.log("[Profile] Username check response:", data, "available field:", data.available, "type:", typeof data.available);
      
      setUsernameAvailable(data.available === true);
    } catch (error) {
      console.error("[Profile] Error checking username:", error);
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleSaveProfile = async () => {
    // Validate username if changed
    if (editData.username !== user?.username && !usernameAvailable) {
      setSaveMessage("Username is not available");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      
      // Add Authorization header if we have an access token
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      // Prepare payload with location data separated
      const payload = {
        username: editData.username,
        bio: editData.bio,
        location: editData.location.address,
        latitude: editData.location.lat,
        longitude: editData.location.lng,
        sports: editData.sports,
      };

      const response = await fetch(
        `${API_BASE_URL}/auth/profile`,
        {
          method: "PATCH",
          credentials: "include",
          headers,
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save profile");
      }

      const data = await response.json();
      console.log("[Profile] Profile updated, new user data:", data.user);

      setSaveMessage("Profile updated successfully!");
      
      // Update user in auth context instead of reloading
      if (setUser && data.user) {
        setUser(data.user);
      }
      
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveMessage("");
      }, 1500);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Failed to save profile");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await Api.deleteAccount();
      // Account deleted successfully, logout and redirect to landing page
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Failed to delete account:", error);
      alert("Failed to delete account. Please try again.");
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <WebLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-3 sm:px-0">
          <div className="max-w-md w-full rounded-2xl sm:rounded-3xl border border-amber-600/50 bg-amber-500/10 backdrop-blur p-6 sm:p-8 text-center">
            <div className="flex h-16 sm:h-20 w-16 sm:w-20 items-center justify-center rounded-full bg-amber-500/20 border border-amber-500/40 mx-auto mb-4 sm:mb-6">
              <div className="flex h-12 sm:h-16 w-12 sm:w-16 items-center justify-center rounded-full bg-amber-500/40 text-2xl sm:text-3xl font-semibold uppercase text-amber-300">
                ?
              </div>
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-amber-400 mb-2">Create Your Profile</h2>
            <p className="text-xs sm:text-sm text-amber-100/80 mb-6">
              Log in to build your player profile, connect with other players, and join pickup games.
            </p>
            <div className="flex gap-3 flex-col">
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
        </div>
      </WebLayout>
    );
  }

  return (
    <WebLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Hero Section with User Info */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-4 sm:p-8 md:p-12">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-red-500/5 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 w-48 sm:w-96 h-48 sm:h-96 bg-red-500/5 rounded-full blur-3xl -z-10"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-8 relative z-10">
            {/* Avatar and basic info */}
            <div className="flex items-center gap-3 sm:gap-6 w-full">
              <div className="flex h-16 sm:h-24 w-16 sm:w-24 flex-shrink-0 items-center justify-center rounded-lg sm:rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-2xl sm:text-4xl font-bold uppercase text-white shadow-lg">
                {user.username.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2 truncate">{user.username}</h1>
                <div className="flex items-center gap-2 text-neutral-400 mb-2 sm:mb-3 min-w-0">
                  <span className="text-xs sm:text-sm truncate">{user.email}</span>
                </div>
                {user.bio && (
                  <p className="text-neutral-300 text-xs sm:text-sm mb-2 sm:mb-3 italic line-clamp-2">{user.bio}</p>
                )}
                {user.location && (
                  <div className="flex items-center gap-2 text-neutral-400 text-xs sm:text-sm mb-2 sm:mb-3">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{user.location}</span>
                  </div>
                )}
                {user.sports && normalizeSports(user.sports).length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
                    {normalizeSports(user.sports).map((sport, idx) => (
                      <span key={idx} className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium">
                        {sport}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-red-400">
                  <Calendar className="w-3 sm:w-4 h-3 sm:h-4 flex-shrink-0" />
                  <span>Member since {formatJoinDate(user?.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="md:ml-auto flex flex-col gap-2 sm:gap-3 w-full md:w-auto">
              <button
                onClick={() => {
                  console.log("[Profile] Logout button clicked");
                  logout().then(() => {
                    console.log("[Profile] Logout completed, redirecting to /");
                    router.push("/");
                  }).catch((err) => {
                    console.error("[Profile] Logout failed:", err);
                  });
                }}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl border border-neutral-700 text-xs sm:text-sm text-neutral-300 hover:border-red-400 hover:text-red-300 transition font-medium"
              >
                Log Out
              </button>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-red-500/20 border border-red-500/40 text-xs sm:text-sm text-red-300 hover:bg-red-500/30 hover:border-red-400 transition font-medium"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-neutral-400 text-sm font-medium">Games Played</h3>
              <Trophy className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.gamesPlayed}</p>
          </div>

          <div className="rounded-lg sm:rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h3 className="text-neutral-400 text-xs sm:text-sm font-medium">Following</h3>
              <UserCheck className="w-4 sm:w-5 h-4 sm:h-5 text-red-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{stats.following}</p>
          </div>

          <div className="rounded-lg sm:rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h3 className="text-neutral-400 text-xs sm:text-sm font-medium">Followers</h3>
              <Users className="w-4 sm:w-5 h-4 sm:h-5 text-red-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{stats.followers}</p>
          </div>

          <div className="rounded-lg sm:rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <h3 className="text-neutral-400 text-xs sm:text-sm font-medium">Upcoming</h3>
              <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-red-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">{stats.upcomingGames}</p>
          </div>
        </div>

        {/* Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 rounded-lg sm:rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-4 sm:p-8">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-1 h-6 bg-red-500 rounded-full"></div>
              <h2 className="text-base sm:text-xl font-bold text-white">Recent Activity</h2>
            </div>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((event) => (
                  <div key={event.id} className="flex gap-4 pb-4 border-b border-neutral-700/50 last:border-0 last:pb-0">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-red-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate text-sm sm:text-base">{event.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-neutral-400 text-xs px-2 py-1 rounded-full bg-neutral-800/50">{event.sport}</span>
                        <span className="text-neutral-400 text-xs px-2 py-1 rounded-full bg-neutral-800/50">
                          {isUpcomingEvent(event.event_date) ? "Upcoming" : "Past"}
                        </span>
                      </div>
                      <p className="text-neutral-400 text-xs sm:text-sm mt-2">{formatEventDate(event.event_date)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <Activity className="w-8 sm:w-12 h-8 sm:h-12 text-neutral-700 mx-auto mb-3 sm:mb-4" />
                  <p className="text-neutral-400 text-sm sm:text-base">No activity yet</p>
                  <p className="text-neutral-500 text-xs sm:text-sm mt-1">Your activity will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Account Stats */}
          <div className="rounded-lg sm:rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-4 sm:p-8">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="w-1 h-6 bg-red-500 rounded-full"></div>
              <h2 className="text-base sm:text-xl font-bold text-white">Account</h2>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div>
                <p className="text-neutral-400 text-xs sm:text-sm mb-1 sm:mb-2">Email Address</p>
                <p className="text-white font-medium break-all text-xs sm:text-sm">{user.email}</p>
              </div>
              <div>
                <p className="text-neutral-400 text-xs sm:text-sm mb-1 sm:mb-2">Account Status</p>
                <div className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-green-500/20 border border-green-500/40">
                  <span className="text-green-300 text-xs sm:text-sm font-medium">Active</span>
                </div>
              </div>
              <div>
                <p className="text-neutral-400 text-sm mb-2">Joined</p>
                <p className="text-white font-medium">{formatJoinDate(user?.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Delete Account Section - Moved to bottom */}
        </div>

        {/* Upcoming Events */}
        <div className="rounded-lg sm:rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-4 sm:p-8">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <div className="w-1 h-6 bg-red-500 rounded-full"></div>
            <h2 className="text-base sm:text-xl font-bold text-white">Your Upcoming Games</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingGames.length > 0 ? (
              upcomingGames.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-neutral-700 bg-neutral-800/40 hover:bg-neutral-800/60 backdrop-blur p-4 transition group cursor-pointer"
                >
                  {/* Header with sport and status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-bold text-sm sm:text-base group-hover:text-red-400 transition truncate">
                        {event.name}
                      </h3>
                      <div className="flex gap-2 flex-wrap mt-2">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-medium">
                          {event.sport}
                        </span>
                        {event.skill_level && (
                          <span className="inline-block px-2.5 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs font-medium">
                            {event.skill_level}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date and Time */}
                  <div className="flex items-center gap-2 text-neutral-300 text-xs sm:text-sm mb-3 pb-3 border-b border-neutral-700/50">
                    <Calendar className="w-4 h-4 flex-shrink-0 text-red-400" />
                    <span>{formatEventDate(event.event_date)}</span>
                  </div>

                  {/* Location */}
                  {event.location && (
                    <div className="flex items-center gap-2 text-neutral-300 text-xs sm:text-sm mb-3">
                      <MapPin className="w-4 h-4 flex-shrink-0 text-red-400" />
                      <span className="truncate">{event.location}</span>
                    </div>
                  )}

                  {/* Players Count */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1 text-neutral-300 text-xs sm:text-sm">
                      <Users className="w-4 h-4 text-red-400" />
                      <span>
                        {event.current_players}/{event.max_players} players
                      </span>
                    </div>
                  </div>

                  {/* Notes if available */}
                  {event.notes && (
                    <div className="text-neutral-400 text-xs italic mb-3 line-clamp-2">
                      &quot;{event.notes}&quot;
                    </div>
                  )}

                  {/* View Details Button */}
                  <button className="w-full mt-2 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs sm:text-sm font-medium hover:bg-red-500/30 hover:border-red-500/60 transition">
                    View Details
                  </button>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 sm:py-12">
                <Trophy className="w-8 sm:w-12 h-8 sm:h-12 text-neutral-700 mx-auto mb-3 sm:mb-4" />
                <p className="text-neutral-400 text-sm sm:text-base">No upcoming games yet</p>
                <p className="text-neutral-500 text-xs sm:text-sm mt-1">Join or create games to see them here</p>
              </div>
            )}
          </div>
        </div>

        {/* Delete Account Section - Danger Zone */}
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 backdrop-blur p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-red-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-white">Danger Zone</h2>
          </div>
          <div className="space-y-4">
            <p className="text-neutral-300 text-sm">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:border-red-500/60 transition font-medium"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-neutral-800 bg-neutral-900 p-6 sm:p-8 shadow-2xl max-h-screen overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white">Edit Profile</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-neutral-800 rounded-lg transition flex-shrink-0"
              >
                <X className="w-4 sm:w-5 h-4 sm:h-5 text-neutral-400" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4 sm:space-y-5 mb-6">
              {/* Username */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-neutral-300 mb-1 sm:mb-2">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="username"
                    value={editData.username}
                    onChange={handleEditChange}
                    placeholder="Your username"
                    className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800/50 text-white placeholder-neutral-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition pr-10"
                  />
                  {editData.username !== user?.username && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingUsername ? (
                        <div className="w-5 h-5 border-2 border-neutral-500 border-t-red-400 rounded-full animate-spin"></div>
                      ) : usernameAvailable ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : usernameAvailable === false ? (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      ) : null}
                    </div>
                  )}
                </div>
                {editData.username !== user?.username && usernameAvailable === false && !checkingUsername && (
                  <p className="text-xs text-red-400 mt-1">Username already taken or invalid</p>
                )}
                {editData.username !== user?.username && usernameAvailable === true && (
                  <p className="text-xs text-green-400 mt-1">Username is available</p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={editData.bio}
                  onChange={handleEditChange}
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-3 rounded-xl border border-neutral-700 bg-neutral-800/50 text-white placeholder-neutral-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition resize-none"
                  rows={3}
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Location
                </label>
                <LocationPicker
                  value={editData.location.address ? editData.location : null}
                  onChange={(loc) => setEditData((prev) => ({ ...prev, location: loc }))}
                  placeholder="Search for your location..."
                />
              </div>

              {/* Sports */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-3">
                  Favorite Sports
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_SPORTS.map((sport) => {
                    const isSelected = Array.isArray(editData.sports) && editData.sports.includes(sport);
                    return (
                      <button
                        key={sport}
                        type="button"
                        onClick={() => handleSportToggle(sport)}
                        className={`px-4 py-2.5 rounded-lg font-medium text-sm transition border ${
                          isSelected
                            ? "bg-red-500/30 border-red-500/60 text-red-200"
                            : "bg-neutral-800/50 border-neutral-700 text-neutral-400 hover:border-red-500/40 hover:bg-neutral-800/70"
                        }`}
                      >
                        {isSelected && <span className="mr-2">✓</span>}
                        {sport}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  {Array.isArray(editData.sports) && editData.sports.length > 0
                    ? `${editData.sports.length} sport${editData.sports.length !== 1 ? "s" : ""} selected`
                    : "Select at least one sport"}
                </p>
              </div>
            </div>

            {/* Success Message */}
            {saveMessage && (
              <div className={`px-4 py-2 rounded-lg text-sm font-medium text-center mb-4 ${
                saveMessage.includes("successfully") 
                  ? "bg-green-500/20 text-green-300 border border-green-500/40"
                  : "bg-red-500/20 text-red-300 border border-red-500/40"
              }`}>
                {saveMessage}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:border-neutral-600 hover:text-neutral-200 transition font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 hover:border-red-400 transition font-medium disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmDelete={handleDeleteAccount}
      />
    </WebLayout>
  );
}
