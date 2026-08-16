"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatFee } from "@/lib/format";
import { formatLabel, isTeamFormat } from "@/lib/event-types";

type CategoryOption = {
  id: string;
  name: string;
  format: string | null;
  minMembers: number;
  maxMembers: number;
  entryFee: number | null;
  entryCurrency: string;
  maxCompetitors: number | null;
  registeredCount: number;
};

type ArtistResult = {
  id: string;
  username: string | null;
  name: string | null;
  style: string | null;
  crew: string | null;
};

export function RegistrationForm({
  eventId,
  categories,
  registeredCategoryIds,
  paidCategoryIds,
  claimedCategoryIds,
  pendingRegistrationIds,
  currentUser,
}: {
  eventId: string;
  categories: CategoryOption[];
  registeredCategoryIds: Set<string>;
  paidCategoryIds: Set<string>;
  claimedCategoryIds: Set<string>;
  pendingRegistrationIds: Record<string, string>;
  currentUser: { name: string | null; username: string | null };
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [teamName, setTeamName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistResult[]>([]);
  const [members, setMembers] = useState<ArtistResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  const selectedCategories = categories.filter((category) => selected.has(category.id));
  const selectedCategory = selectedCategories[0];
  const isTeam = selectedCategory ? isTeamFormat(selectedCategory.format) : false;
  const requiredMin = selectedCategory?.minMembers ?? 1;
  const requiredMax = selectedCategory?.maxMembers ?? 1;
  const rosterCount = members.length + 1;
  const rosterFull = members.length + 1 >= requiredMax;
  const total = selectedCategories.reduce((sum, category) => sum + (category.entryFee ?? 0), 0);
  const selfLabel = currentUser.username ? `@${currentUser.username}` : currentUser.name ?? "you";

  function toggleCategory(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    setError("");
  }

  async function searchArtists() {
    if (query.trim().length < 2) return;
    setSearching(true);
    const response = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
    const data = await response.json().catch(() => []);
    setResults(response.ok && Array.isArray(data) ? data : []);
    setSearching(false);
  }

  function addMember(artist: ArtistResult) {
    if (members.length + 1 >= requiredMax) return;
    if (!members.some((member) => member.id === artist.id)) setMembers((current) => [...current, artist]);
    setResults((current) => current.filter((member) => member.id !== artist.id));
    setQuery("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (selectedCategories.length === 0) return;
    if (isTeam && !teamName.trim()) {
      setError("Add a team or crew name.");
      return;
    }
    if (isTeam && (rosterCount < requiredMin || rosterCount > requiredMax)) {
      setError(`This entry needs ${requiredMin === requiredMax ? requiredMin : `${requiredMin}–${requiredMax}`} members.`);
      return;
    }

    const params = new URLSearchParams({ event: eventId, cats: [...selected].join(",") });
    const trimmedTeamName = teamName.trim();
    if (trimmedTeamName) params.set("team", trimmedTeamName);
    if (members.length > 0) params.set("members", members.map((member) => member.id).join(","));
    router.push(`/cart?${params.toString()}`);
  }

  return (
    <form className="mt-section" onSubmit={handleSubmit}>
      <div className="border border-line">
        <div className="border-b border-line bg-paper-soft px-lg py-md">
          <p className="font-display text-title-md uppercase">Choose your categories</p>
          <p className="mt-xs text-body-sm text-ink-muted">Each category is one entry. The captain pays one combined fee per entry.</p>
        </div>
        <ul className="divide-y divide-line">
          {categories.map((category) => {
            const disabled = registeredCategoryIds.has(category.id) || (category.maxCompetitors != null && category.registeredCount >= category.maxCompetitors);
            const isRegistered = registeredCategoryIds.has(category.id);
            const isPaid = paidCategoryIds.has(category.id);
            const isFull = category.maxCompetitors != null && category.registeredCount >= category.maxCompetitors;
            return (
              <li key={category.id} className="flex items-center gap-md px-lg py-md">
                <input type="checkbox" checked={selected.has(category.id)} disabled={disabled} onChange={() => toggleCategory(category.id)} className="h-4 w-4 shrink-0 border border-line bg-paper accent-current" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-title-md uppercase">{category.name}</p>
                  <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-accent">
                    {formatLabel(category.format)} · {category.minMembers === category.maxMembers ? category.minMembers : `${category.minMembers}–${category.maxMembers}`} members
                  </p>
                  <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
                    {category.registeredCount} entries{category.maxCompetitors != null ? ` / max ${category.maxCompetitors}` : ""}
                  </p>
                </div>
                <span className="font-mono text-body-sm uppercase text-accent">{formatFee(category.entryFee, category.entryCurrency)}</span>
                {isPaid ? (
                  <span className="w-28 text-right font-mono text-[0.65rem] uppercase text-ink-muted">Confirmed</span>
                ) : pendingRegistrationIds[category.id] ? (
                  <Link
                    href={`/cart?event=${eventId}&ids=${pendingRegistrationIds[category.id]}`}
                    className="border border-accent px-sm py-xs font-mono text-[0.65rem] font-bold uppercase tracking-[0.1em] text-accent hover:bg-accent hover:text-paper"
                  >
                    Continue to payment &rarr;
                  </Link>
                ) : claimedCategoryIds.has(category.id) ? (
                  <span className="w-28 text-right font-mono text-[0.65rem] uppercase text-ink-muted">Registered</span>
                ) : isRegistered ? (
                  <span className="w-28 text-right font-mono text-[0.65rem] uppercase text-ink-muted">Wait for verification</span>
                ) : isFull ? (
                  <span className="w-28 text-right font-mono text-[0.65rem] uppercase text-ink-muted">Full</span>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-sm border-t border-line bg-paper-soft px-lg py-md">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Total entry</span>
          <span className="font-display text-display-lg uppercase text-accent">{formatFee(total, "INR")}</span>
        </div>
      </div>

      {!isTeam && selectedCategory ? (
        <div className="mt-section border border-line bg-paper-soft px-lg py-md">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Entering as</p>
          <p className="mt-xs font-display text-title-md uppercase text-accent">{selfLabel}</p>
        </div>
      ) : null}

      {isTeam ? (
        <div className="mt-section border border-line">
          <div className="border-b border-line bg-paper-soft px-lg py-md">
            <p className="font-display text-title-md uppercase">Build your roster</p>
            <p className="mt-xs text-body-sm text-ink-muted">You are the captain. Add CYPHR artists by username. They will be invited to confirm after you have paid.</p>
          </div>
          <div className="space-y-md p-lg">
            <input className="w-full border border-line bg-paper px-md py-sm text-body-sm" value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Team or crew name" />
            <div className="flex gap-sm">
              <input className="min-w-0 flex-1 border border-line bg-paper px-md py-sm text-body-sm" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void searchArtists(); } }} placeholder="Search username" disabled={rosterFull} />
              <button className="border border-line px-md py-sm font-mono text-[0.7rem] font-bold uppercase hover:border-accent disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => void searchArtists()} disabled={searching || rosterFull}>{searching ? "..." : "Search"}</button>
            </div>
            {rosterFull ? <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">Roster full — this category allows {requiredMax} member{requiredMax === 1 ? "" : "s"}.</p> : null}
            {results.length > 0 ? <div className="border border-line">{results.map((artist) => <button key={artist.id} className="flex w-full items-center justify-between border-b border-line px-md py-sm text-left last:border-b-0 hover:bg-paper-soft disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={() => addMember(artist)} disabled={rosterFull}><span><span className="font-bold">{artist.name ?? "Unnamed"}</span><span className="ml-sm font-mono text-[0.7rem] text-accent">@{artist.username ?? "no-username"}</span></span><span className="text-body-sm text-ink-muted">Add</span></button>)}</div> : null}
            <div className="border-t border-line pt-md">
              <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Roster: {rosterCount} / {requiredMax}</p>
              <div className="mt-sm space-y-xs"><div className="flex items-center justify-between text-body-sm"><span>You — captain · {selfLabel}</span><span className="font-mono text-[0.65rem] uppercase text-accent">Accepted</span></div>{members.map((member) => <div key={member.id} className="flex items-center justify-between text-body-sm"><span>{member.name ?? "Unnamed"} <span className="font-mono text-[0.65rem] text-ink-muted">@{member.username ?? "—"}</span></span><button className="font-mono text-[0.65rem] uppercase text-ink-muted hover:text-accent" type="button" onClick={() => setMembers((current) => current.filter((item) => item.id !== member.id))}>Remove</button></div>)}</div>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}
      <button className="mt-xl w-full border border-accent bg-accent px-lg py-md text-button-md font-bold uppercase text-paper disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={selected.size === 0}>{selected.size === 0 ? "Select at least one category" : `Continue to payment — ${formatFee(total, "INR")}`}</button>
    </form>
  );
}
