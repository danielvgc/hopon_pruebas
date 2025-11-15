"use client";

import WebLayout from "@/components/web-layout";
import { useAuth } from "@/context/auth-context";
import { useEffect, useState } from "react";
import { Calendar, Users, UserCheck, Trophy, Clock, MapPin, X } from "lucide-react";

export default function ProfilePage() {
  useEffect(() => {
    document.title = "Profile - HopOn";
  }, []);
  
  const { status, user, logout } = useAuth();
  const isAuthenticated = status === "authenticated";
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    bio: user?.bio || "",
    location: user?.location || "",
    sports: user?.sports || "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      // Simulate API call - in real implementation, call backend
      console.log("Saving profile:", editData);
      setSaveMessage("Profile updated successfully!");
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSaveMessage("");
      }, 1500);
    } catch (error) {
      setSaveMessage("Failed to save profile");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <WebLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="max-w-md w-full rounded-3xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 border border-red-500/40 mx-auto mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/40 text-3xl font-semibold uppercase text-red-300">
                ?
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Create Your Profile</h2>
            <p className="text-neutral-400 mb-6">
              Sign in to build your player profile, connect with other players, and join pickup games.
            </p>
          </div>
        </div>
      </WebLayout>
    );
  }

  return (
    <WebLayout>
      <div className="space-y-8">
        {/* Hero Section with User Info */}
        <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-8 md:p-12">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -z-10"></div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8 relative z-10">
            {/* Avatar and basic info */}
            <div className="flex items-center gap-6">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-4xl font-bold uppercase text-white shadow-lg">
                {user.username.slice(0, 1)}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{user.username}</h1>
                <div className="flex items-center gap-2 text-neutral-400 mb-3">
                  <span className="text-sm">{user.email}</span>
                </div>
                {user.bio && (
                  <p className="text-neutral-300 text-sm mb-3 italic">{user.bio}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <Calendar className="w-4 h-4" />
                  <span>Member since January 2024</span>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="md:ml-auto flex flex-col gap-3 w-full md:w-auto">
              <button
                onClick={() => logout().catch(() => undefined)}
                className="px-6 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:border-red-400 hover:text-red-300 transition font-medium text-sm"
              >
                Log Out
              </button>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 hover:border-red-400 transition font-medium text-sm"
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
            <p className="text-3xl font-bold text-white">42</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-neutral-400 text-sm font-medium">Following</h3>
              <UserCheck className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white">567</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-neutral-400 text-sm font-medium">Followers</h3>
              <Users className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white">1,234</p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-neutral-400 text-sm font-medium">Upcoming</h3>
              <Clock className="w-5 h-5 text-red-400" />
            </div>
            <p className="text-3xl font-bold text-white">3</p>
          </div>
        </div>

        {/* Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-red-500 rounded-full"></div>
              <h2 className="text-xl font-bold text-white">Recent Activity</h2>
            </div>
            <div className="space-y-4">
              {[
                { action: "Joined Basketball game", place: "Downtown Park", time: "2 hours ago" },
                { action: "Created Football match", place: "Sports Complex", time: "1 day ago" },
                { action: "Joined Volleyball tournament", place: "Beach Court", time: "3 days ago" },
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-4 pb-4 border-b border-neutral-800 last:border-b-0">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{activity.action}</p>
                    <p className="text-neutral-400 text-sm">{activity.place}</p>
                  </div>
                  <p className="text-neutral-500 text-sm">{activity.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Account Stats */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-red-500 rounded-full"></div>
              <h2 className="text-xl font-bold text-white">Account</h2>
            </div>
            <div className="space-y-6">
              <div>
                <p className="text-neutral-400 text-sm mb-2">Email Address</p>
                <p className="text-white font-medium break-all">{user.email}</p>
              </div>
              <div>
                <p className="text-neutral-400 text-sm mb-2">Account Status</p>
                <div className="inline-block px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40">
                  <span className="text-green-300 text-sm font-medium">Active</span>
                </div>
              </div>
              <div>
                <p className="text-neutral-400 text-sm mb-2">Joined</p>
                <p className="text-white font-medium">January 2024</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 backdrop-blur p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-red-500 rounded-full"></div>
            <h2 className="text-xl font-bold text-white">Your Upcoming Games</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { sport: "Basketball", time: "Today at 6:00 PM", players: "8/10", location: "Downtown Court" },
              { sport: "Football", time: "Tomorrow at 7:00 PM", players: "10/11", location: "Sports Complex" },
              { sport: "Volleyball", time: "Saturday at 2:00 PM", players: "5/6", location: "Beach Court" },
            ].map((game, i) => (
              <div key={i} className="rounded-xl border border-neutral-700 bg-neutral-900/60 p-4 hover:border-red-400/50 transition">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">{game.sport}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-300">{game.players}</span>
                </div>
                <p className="text-neutral-400 text-sm mb-2">{game.time}</p>
                <p className="text-neutral-500 text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {game.location}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-neutral-800 rounded-lg transition"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-5 mb-6">
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
                <input
                  type="text"
                  name="location"
                  value={editData.location}
                  onChange={handleEditChange}
                  placeholder="e.g., Toronto, Canada"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800/50 text-white placeholder-neutral-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition"
                />
              </div>

              {/* Sports */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Favorite Sports
                </label>
                <input
                  type="text"
                  name="sports"
                  value={editData.sports}
                  onChange={handleEditChange}
                  placeholder="e.g., Basketball, Football, Tennis"
                  className="w-full px-4 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800/50 text-white placeholder-neutral-500 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition"
                />
                <p className="text-xs text-neutral-500 mt-1">Separate multiple sports with commas</p>
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
    </WebLayout>
  );
}
