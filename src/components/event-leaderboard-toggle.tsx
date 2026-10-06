"use client";

import { useState } from "react";
import { LiveLeaderboard } from "@/components/live-leaderboard";

export function EventLeaderboardToggle({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="block w-full border-t border-line px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent transition-colors hover:bg-accent hover:text-paper"
        aria-expanded={open}
      >
        {open ? "Hide leaderboard" : "Show leaderboard"}
      </button>
      {open && (
        <div className="border-t border-line px-md py-sm">
          <LiveLeaderboard eventId={eventId} title="Final standings" compact live={false} filters />
        </div>
      )}
    </>
  );
}
