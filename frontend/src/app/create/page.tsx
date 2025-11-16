"use client";

import WebLayout from "@/components/web-layout";
import { Api } from "@/lib/api";
import * as React from "react";

export default function CreatePage() {
  React.useEffect(() => {
    document.title = "Create Game - HopOn";
  }, []);

  const [form, setForm] = React.useState({
    name: "",
    sport: "Basketball",
    location: "",
    event_date: "",
    max_players: 10,
    skill_level: "Intermediate",
    notes: "",
  });
  const [result, setResult] = React.useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await Api.createEvent({
        ...form,
        event_date: form.event_date ? new Date(form.event_date).toISOString() : undefined,
        notes: form.notes.trim() ? form.notes.trim() : undefined,
      });
      setResult(`Created: ${res.event.name}`);
      setForm({ ...form, name: "", location: "", event_date: "", notes: "" });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create event";
      setResult(message);
    }
  }

  return (
    <WebLayout title="Create Event">
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
        <Field label="Event Name">
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm"
            required
          />
        </Field>
        <Field label="Sport">
          <select
            value={form.sport}
            onChange={(e) => update("sport", e.target.value)}
            className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm"
          >
            {['Basketball','Tennis','Badminton','Soccer'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location">
          <input
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm"
            placeholder="Venue or address"
            required
          />
        </Field>
        <Field label="Date & Time">
          <input
            type="datetime-local"
            value={form.event_date}
            onChange={(e) => update("event_date", e.target.value)}
            className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm"
            style={{ 
              boxSizing: 'border-box',
              WebkitAppearance: 'none',
              WebkitBorderRadius: '8px'
            }}
          />
        </Field>
        <Field label="Max Players">
          <input
            type="number"
            min={2}
            value={form.max_players}
            onChange={(e) => update("max_players", parseInt(e.target.value || "0", 10))}
            className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm"
          />
        </Field>
        <Field label="Level">
          <select
            value={form.skill_level}
            onChange={(e) => update("skill_level", e.target.value)}
            className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm"
          >
            {['Beginner','Intermediate','Advanced'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description (optional)">
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="w-full rounded-lg sm:rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm"
            rows={3}
            placeholder="Share extra details, gear requirements, or meetup instructions."
          />
        </Field>
        <button
          type="submit"
          className="w-full rounded-lg sm:rounded-xl bg-red-500 px-4 py-2 sm:py-3 font-semibold text-white hover:bg-red-400 text-sm sm:text-base"
        >
          Create
        </button>
        {result && <p className="text-center text-xs sm:text-sm text-neutral-300">{result}</p>}
      </form>
    </WebLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 sm:mb-2 text-xs sm:text-sm text-neutral-300 font-medium">{label}</div>
      {children}
    </label>
  );
}
