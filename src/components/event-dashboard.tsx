"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { io } from "socket.io-client";
import { LiveLeaderboard } from "@/components/live-leaderboard";
import { PosterUpload } from "@/components/poster-upload";
import { formatInr, isEventFlatFeePaid } from "@/lib/pricing";
import { BATTLE_FORMATS, CATEGORY_FORMAT_LABELS, COMPETITION_FORMATS, EVENT_TYPE_LABELS, EVENT_TYPE_LIST, defaultRosterSize, formatLabel, isCompetitionType, isWorkshopType, SINGLE_POINT_ROUND_TYPES } from "@/lib/event-types";
import { INDIAN_STATES } from "@/lib/states";
import { responseError } from "@/lib/client-error";
import type { CategoryFormat, EventStatus, RoundType, RegistrationStatus, PaymentStatus } from "@/generated/prisma/enums";

type Round = {
  id: string;
  categoryId: string;
  order: number;
  type: RoundType;
  label: string | null;
  roundCount: number;
  roundDuration: number | null;
  advanceCount: number | null;
  phaseStatus: string | null;
};

type JudgeSlot = {
  id: string;
  code: string;
  name: string | null;
  isActive: boolean;
};

type JudgeSlotWithCategory = JudgeSlot & {
  category: { id: string; name: string };
};

type PrizePool = {
  id: string;
  categoryId: string;
  totalAmount: number;
  currency: string;
  distribution: unknown;
  isPaid: boolean;
  paidAt: Date | null;
};

type Category = {
  id: string;
  eventId: string;
  name: string;
  format: CategoryFormat | null;
  minMembers: number;
  maxMembers: number;
  entryFee: number | null;
  entryCurrency: string;
  rounds: Round[];
  judgeSlots: JudgeSlot[];
  prizePool: PrizePool | null;
  _count: { registrations: number; registrationMembers: number };
  currentPhaseOrder: number | null;
};

type EventWithRelations = {
  id: string;
  organizerId: string;
  title: string;
  slug: string;
  startsAt: Date;
  status: EventStatus;
  description: string | null;
  eventType: string | null;
  posterUrl: string | null;
  posterFileKey: string | null;
  venue: string | null;
  googleMapsUrl: string | null;
  city: string | null;
  state: string | null;
  flatFee: number | null;
  flatFeePaid: boolean;
  flatFeePaymentStatus: PaymentStatus | null;
  commissionDue: number | null;
  commissionPaid: boolean;
  commissionPaymentStatus: PaymentStatus | null;
  commissionPaymentMethod: string | null;
  commissionPaymentSentAt: Date | string | null;
  categories: Category[];
  judgeSlots: JudgeSlotWithCategory[];
};

type RegistrationRow = {
  id: string;
  userId: string;
  categoryId: string;
  status: RegistrationStatus;
  seed: number | null;
  style: string | null;
  crew: string | null;
  experience: string | null;
  entryFee: number | null;
  entryCurrency: string | null;
  paid: boolean;
  paidAt: Date | null;
  paidClaimedAt: Date | null;
  user: { name: string | null; email: string; whatsappNumber: string | null };
  teamName?: string | null;
  format?: CategoryFormat | null;
  members?: Array<{ id: string; userId: string; role: string; status: string; user: { id: string; name: string | null; username: string | null; whatsappNumber: string | null } }>;
};

const TABS = ["Overview", "Categories", "Judges", "Registrations", "Prizes", "Leaderboard", "Control Room"] as const;

const STATUS_OPTIONS: EventStatus[] = ["DRAFT", "PUBLISHED", "LIVE", "COMPLETED"];

const ROUND_TYPES: RoundType[] = [
  "CYPHER",
  "QUALIFIER",
  "BATTLE_1V1",
  "BATTLE_2V2",
  "BATTLE_3V3",
  "BATTLE_4V4",
  "CREW_VS_CREW",
  "SEVEN_TO_SMOKE",
  "FINAL",
];

export function EventDashboard({ event: initialEvent }: { event: EventWithRelations }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const [event, setEvent] = useState(initialEvent);
  const [controlRoomKey, setControlRoomKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [phaseAction, setPhaseAction] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const refreshControlRoom = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/events/${event.id}/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setEvent({ ...data, startsAt: new Date(data.startsAt) });
        setControlRoomKey((k) => k + 1);
      } else {
        setNotice(await responseError(res, "Failed to refresh control room"));
      }
    } catch {
      setNotice("Failed to refresh control room");
    } finally {
      setRefreshing(false);
    }
  }, [event.id]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001", {
      withCredentials: true,
    });

    const refreshAfterSocketEvent = () => {
      void refreshControlRoom();
    };

    const joinEvent = () => {
      socket.emit("join_event_room", { eventId: event.id, role: "organizer" }, (ack: { ok: boolean; error?: string }) => {
        if (!ack.ok) setNotice(ack.error ?? "Unable to join live event updates");
      });
    };

    socket.on("connect", joinEvent);
    socket.on("score_submitted", refreshAfterSocketEvent);
    socket.on("match_live", refreshAfterSocketEvent);
    socket.on("score_locked", refreshAfterSocketEvent);
    socket.on("match_complete", refreshAfterSocketEvent);

    return () => {
      socket.off("connect", joinEvent);
      socket.off("score_submitted", refreshAfterSocketEvent);
      socket.off("match_live", refreshAfterSocketEvent);
      socket.off("score_locked", refreshAfterSocketEvent);
      socket.off("match_complete", refreshAfterSocketEvent);
      socket.disconnect();
    };
  }, [event.id, refreshControlRoom]);

  const rewindCategory = async (categoryId: string) => {
    if (!window.confirm("Go back to the previous phase? Current phase brackets, scores, and results will be deleted.")) return;
    setPhaseAction(`${categoryId}:rewind`);
    try {
      const res = await fetch(`/api/categories/${categoryId}/rewind-phase`, { method: "POST" });
      if (res.ok) {
        setNotice("Returned to the previous phase");
        await refreshControlRoom();
      } else {
        setNotice(await responseError(res, "Failed to rewind phase"));
      }
    } catch {
      setNotice("Failed to rewind phase");
    } finally {
      setPhaseAction(null);
    }
  };

  const visibleTabs: string[] = isWorkshopType(event.eventType)
    ? TABS.filter((tab) => tab !== "Judges" && tab !== "Prizes" && tab !== "Leaderboard" && tab !== "Control Room")
    : [...TABS];

  const resolvedTab = visibleTabs.includes(activeTab) ? activeTab : "Overview";

  return (
    <div className="mt-section">
      <div className="flex flex-wrap gap-sm mb-xl">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            className={`border px-md py-sm text-button-md font-bold uppercase ${
              resolvedTab === tab
                ? "border-accent bg-accent text-paper"
                : "border-line bg-paper text-ink hover:border-accent"
            }`}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {resolvedTab === "Overview" && (
        <OverviewTab event={event} setEvent={setEvent} />
      )}
      {resolvedTab === "Categories" && (
        <CategoriesTab event={event} refresh={refreshControlRoom} refreshing={refreshing} />
      )}
      {resolvedTab === "Judges" && (
        <JudgesTab event={event} refresh={refreshControlRoom} />
      )}
      {resolvedTab === "Registrations" && (
        <RegistrationsTab event={event} />
      )}
      {resolvedTab === "Prizes" && (
        <PrizesTab event={event} refresh={refresh} />
      )}
      {resolvedTab === "Leaderboard" && (
        <LiveLeaderboard eventId={event.id} title="Leaderboard" />
      )}
      {resolvedTab === "Control Room" && (
        <div className="space-y-xl">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <div className="flex items-center gap-sm">
              {notice ? <div className="border border-accent bg-paper-soft p-md text-body-sm text-accent">{notice} <button onClick={() => setNotice("")}>&times;</button></div> : null}
            </div>
            <button
              className="border border-line px-lg py-sm font-bold uppercase text-ink hover:border-accent disabled:opacity-60"
              onClick={() => void refreshControlRoom()}
              disabled={refreshing}
              type="button"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {isCompetitionType(event.eventType) && (
            <div className="mb-lg border border-accent bg-paper p-md">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">Competition mode</p>
              <p className="mt-xs text-body-sm text-ink-muted">
                Single-point scoring — no 1v1 battles. Judges score each performer 0&ndash;10 with optional feedback, then you advance the top performers to the next round.
              </p>
            </div>
          )}
          {event.status !== "LIVE" ? (
            <div className="border border-line p-xl text-center">
              <p className="font-display text-title-md uppercase text-ink-muted">Event is not live</p>
              <p className="mt-sm text-body-sm text-ink-muted">Switch event status to LIVE in the Overview tab to access the Control Room.</p>
            </div>
          ) : (
            event.categories.map((category) => (
              <div key={category.id} className="border border-line bg-paper-soft p-lg">
                <div className="flex flex-wrap items-center justify-between gap-md">
                  <div>
                    <h3 className="font-display text-title-md uppercase">{category.name}</h3>
                    <p className="mt-xs text-body-sm text-ink-muted">
                      {category.currentPhaseOrder != null 
                         ? `Phase ${(category.currentPhaseOrder ?? 0) + 1} of ${category.rounds.length}: ${category.rounds.find(r => r.order === category.currentPhaseOrder)?.label ?? 'Active'}`
                        : category.rounds.every(r => r.phaseStatus === "COMPLETE") ? 'All phases complete' : 'Not started'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-lg">
                  <div className="flex gap-xs">
                    {category.rounds.map((round) => {
                      const isComplete = round.phaseStatus === "COMPLETE";
                      const isActive = round.phaseStatus === "ACTIVE";
                      const bg = isComplete ? "bg-accent" : isActive ? "bg-accent" : "bg-line";
                      return (
                        <div key={round.id} className={`h-2 flex-1 ${bg}`} 
                          title={`${round.label ?? round.type} — ${round.phaseStatus}`} />
                      );
                    })}
                  </div>
                  <div className="mt-xs flex text-[0.6rem] font-mono uppercase text-ink-muted">
                    {category.rounds.map(round => (
                      <span key={round.id} className="flex-1 truncate px-xs">{round.label ?? round.type.replace('_', ' ')}</span>
                    ))}
                  </div>
                </div>

                <div className="mt-lg flex flex-wrap gap-sm">
                  {category.currentPhaseOrder == null && category.rounds.some(r => r.phaseStatus === "PENDING") && (
                    <button className="border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper"
                      disabled={phaseAction !== null}
                      onClick={async () => {
                        setPhaseAction(`${category.id}:start`);
                        try {
                          const res = await fetch(`/api/categories/${category.id}/start-phase`, { method: "POST" });
                          if (res.ok) {
                            setNotice("Phase started");
                            await refreshControlRoom();
                          } else {
                            setNotice(await responseError(res, "Failed to start phase"));
                          }
                        } catch {
                          setNotice("Network error. Please try again.");
                        } finally {
                          setPhaseAction(null);
                        }
                      }}>
                      Start {category.rounds.find(r => r.phaseStatus === "PENDING")?.label ?? "Phase"}
                    </button>
                  )}
                  
                  {category.currentPhaseOrder != null && category.rounds.find(r => r.order === category.currentPhaseOrder && r.phaseStatus === "ACTIVE") && (
                    <>
                      <button className="border border-accent px-lg py-sm font-bold uppercase text-accent hover:bg-accent hover:text-paper"
                        disabled={phaseAction !== null}
                        onClick={async () => {
                          setPhaseAction(`${category.id}:advance`);
                          try {
                            const res = await fetch(`/api/categories/${category.id}/advance-phase`, { method: "POST" });
                            if (res.ok) {
                              setNotice("Advanced to the next phase");
                              await refreshControlRoom();
                            } else {
                              setNotice(await responseError(res, "Failed to advance phase"));
                            }
                          } catch {
                            setNotice("Network error. Please try again.");
                          } finally {
                            setPhaseAction(null);
                          }
                        }}>
                        {phaseAction === `${category.id}:advance` ? "Advancing..." : "Advance to next phase"}
                      </button>
                      {category.rounds.some((round) => round.order < (category.currentPhaseOrder ?? 0)) && (
                        <button
                          className="border border-line px-lg py-sm font-bold uppercase text-ink hover:border-accent disabled:opacity-60"
                          disabled={phaseAction !== null}
                          onClick={() => void rewindCategory(category.id)}
                        >
                          {phaseAction === `${category.id}:rewind` ? "Rewinding..." : "Back to previous phase"}
                        </button>
                      )}
                      {["CYPHER", "QUALIFIER"].includes(category.rounds.find((r) => r.order === category.currentPhaseOrder)?.type ?? "") && (
                        <span className="text-body-sm text-ink-muted">
                          {category.rounds.find((r) => r.order === category.currentPhaseOrder)?.type === "CYPHER"
                             ? "Cypher round — no battles. Pick the entries who advance below."
                             : "Qualifier round — pick the entries who advance below."}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {category.currentPhaseOrder == null && category.rounds.length > 1 && category.rounds.every((round) => round.phaseStatus === "COMPLETE") && (
                  <button
                    className="mt-md border border-line px-lg py-sm font-bold uppercase text-ink hover:border-accent disabled:opacity-60"
                    disabled={phaseAction !== null}
                    onClick={() => void rewindCategory(category.id)}
                  >
                    {phaseAction === `${category.id}:rewind` ? "Rewinding..." : "Back to previous phase"}
                  </button>
                )}

                {category.rounds.some((round) => round.type === "CYPHER") && (
                  <button
                    className="mt-md border border-accent px-lg py-sm font-bold uppercase text-accent hover:bg-accent hover:text-paper disabled:opacity-60"
                    disabled={phaseAction !== null}
                    onClick={async () => {
                      if (!window.confirm("Reset this category to Cypher? All phase results, brackets, scores, and withdrawals will be cleared. Registrations will be restored and reseeded.")) return;
                       setPhaseAction(`${category.id}:reset`);
                       try {
                         const res = await fetch(`/api/categories/${category.id}/reset-cypher`, { method: "POST" });
                         if (res.ok) {
                           setNotice("Category reset to Cypher with registrations reseeded");
                           await refreshControlRoom();
                         } else {
                           setNotice(await responseError(res, "Failed to reset category"));
                         }
                       } catch {
                         setNotice("Network error. Please try again.");
                       } finally {
                         setPhaseAction(null);
                       }
                    }}
                  >
                    {phaseAction === `${category.id}:reset` ? "Resetting..." : "Reset to Cypher"}
                  </button>
                )}

                {category.currentPhaseOrder != null && ["CYPHER", "QUALIFIER"].includes(category.rounds.find((r) => r.order === category.currentPhaseOrder)?.type ?? "") && (
                  <CypherDancerPicker
                    key={`${category.id}-${controlRoomKey}`}
                    eventId={event.id}
                    categoryId={category.id}
                    onResult={(ok, message) => {
                      setNotice(ok ? "Advancement confirmed" : message ?? "Failed to advance");
                      if (ok) void refreshControlRoom();
                    }}
                  />
                )}

                {category.currentPhaseOrder != null && (() => {
                  const currentPhase = category.rounds.find(r => r.order === category.currentPhaseOrder && r.phaseStatus === "ACTIVE");
                   if (!currentPhase || !["BATTLE_1V1","BATTLE_2V2","BATTLE_3V3","BATTLE_4V4","CREW_VS_CREW","FINAL"].includes(currentPhase.type)) return null;
                   return (
                     <BracketView
                       key={`${category.id}-${controlRoomKey}`}
                       categoryId={category.id}
                       eventId={event.id}
                       phaseLabel={currentPhase.label ?? currentPhase.type}
                       advanceCount={currentPhase.advanceCount}
                     />
                   );
                })()}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function OverviewTab({
  event,
  setEvent,
}: {
  event: EventWithRelations;
  setEvent: (e: EventWithRelations) => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const flatFeePaid = isEventFlatFeePaid(event);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    const title = form.get("title") as string;
    const slug = form.get("slug") as string;
    const venue = form.get("venue") as string;
    const googleMapsUrl = form.get("googleMapsUrl") as string;
    const city = form.get("city") as string;
    const state = form.get("state") as string;
    const startsAt = form.get("startsAt") as string;
    const description = form.get("description") as string;
    const eventType = form.get("eventType") as string;

    if (title && title !== event.title) body.title = title;
    if (slug && slug !== event.slug) body.slug = slug;
    body.venue = venue || null;
    body.googleMapsUrl = googleMapsUrl || null;
    body.city = city || null;
    body.state = state || null;
    body.description = description || null;
    body.eventType = eventType || null;
    if (startsAt) body.startsAt = new Date(startsAt).toISOString();

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed to save"));
        return;
      }
      const updated = await res.json();
      setEvent({ ...event, ...updated, startsAt: new Date(updated.startsAt) });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: EventStatus) {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { code?: string; error?: unknown } | null;
        if (err?.code === "COMMISSION_REQUIRED") {
          setError(typeof err.error === "string" ? err.error : "Commission required");
          router.push(`/organizer/${event.id}/bill#commission`);
          return;
        }
        setError(typeof err?.error === "string" ? err.error : "Failed to update status");
        return;
      }
      const updated = await res.json();
      setEvent({ ...event, ...updated, startsAt: new Date(updated.startsAt) });
      if (Array.isArray(updated.bracketWarnings) && updated.bracketWarnings.length > 0) {
        setError(`Brackets were not generated — ${updated.bracketWarnings.join("; ")}. Generate them from the Control Room once rosters are ready.`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const totalRegistrations = event.categories.reduce(
    (s, c) => s + c._count.registrations,
    0,
  );
  const totalMembers = event.categories.reduce((sum, category) => sum + category._count.registrationMembers, 0);
  const totalJudgeSlots = event.judgeSlots.length;

  return (
    <div className="space-y-xl">
      {!flatFeePaid ? (
        event.flatFeePaymentStatus === "PENDING" ? (
          <div className="flex flex-wrap items-center justify-between gap-md border border-accent bg-paper-soft p-lg">
            <div>
              <p className="font-display text-title-md uppercase text-accent">Payment sent — waiting for confirmation</p>
              <p className="mt-xs text-body-sm text-ink-muted">
                Your {formatInr(event.flatFee ?? 0)} flat fee is being verified. It usually takes a few minutes.
              </p>
            </div>
            <Link
              href={`/organizer/${event.id}/bill`}
              className="border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper"
            >
              View bill
            </Link>
          </div>
        ) : (
        <div className="flex flex-wrap items-center justify-between gap-md border border-accent bg-paper-soft p-lg">
          <div>
            <p className="font-display text-title-md uppercase text-accent">Pay the flat fee to activate</p>
            <p className="mt-xs text-body-sm text-ink-muted">
              This event needs a {formatInr(event.flatFee ?? 0)} flat fee before it can be published or go live.
            </p>
          </div>
          <Link
            href={`/organizer/${event.id}/bill`}
            className="border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper"
          >
            Pay flat fee
          </Link>
        </div>
        )
      ) : null}

      <div className="grid gap-xl lg:grid-cols-3">
      <form className="border border-line p-lg lg:col-span-2" onSubmit={handleSave}>
        <p className="font-display text-title-md uppercase">Event details</p>
        <div className="mt-lg grid gap-md md:grid-cols-2">
          <input
            className="border border-line bg-paper px-md py-sm text-body-sm"
            name="title"
            defaultValue={event.title}
            placeholder="Event title"
          />
          <input
            className="border border-line bg-paper px-md py-sm text-body-sm"
            name="slug"
            defaultValue={event.slug}
            placeholder="event-slug"
          />
          <input
            className="border border-line bg-paper px-md py-sm text-body-sm"
            name="venue"
            defaultValue={event.venue ?? ""}
            placeholder="Venue"
          />
          <input
            className="border border-line bg-paper px-md py-sm text-body-sm md:col-span-2"
            name="googleMapsUrl"
            type="url"
            defaultValue={event.googleMapsUrl ?? ""}
            placeholder="https://maps.app.goo.gl/... (Google Maps link for directions)"
          />
          <input
            className="border border-line bg-paper px-md py-sm text-body-sm"
            name="city"
            defaultValue={event.city ?? ""}
            placeholder="City"
          />
          <label className="block">
            <span className="font-mono text-[0.7rem] uppercase text-ink-muted">State</span>
            <select
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
              name="state"
              defaultValue={event.state ?? ""}
            >
              <option value="">Select a state</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <input
            className="border border-line bg-paper px-md py-sm text-body-sm md:col-span-2"
            name="startsAt"
            type="datetime-local"
            defaultValue={event.startsAt.toISOString().slice(0, 16)}
          />
          <label className="block md:col-span-2">
            <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Event type</span>
            <select
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
              name="eventType"
              defaultValue={event.eventType ?? ""}
            >
              <option value="">Select a type</option>
              {EVENT_TYPE_LIST.map((t) => (
                <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
          <textarea
            className="border border-line bg-paper px-md py-sm text-body-sm md:col-span-2"
            name="description"
            rows={4}
            defaultValue={event.description ?? ""}
            placeholder="Event description — shown on the public event page"
          />
        </div>

        <div className="mt-lg">
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Poster</p>
          <div className="mt-xs max-w-64">
            <PosterUpload
              initial={event.posterUrl}
              onChange={async (value, fileKey) => {
                try {
                  const res = await fetch(`/api/events/${event.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ posterUrl: value, posterFileKey: fileKey }),
                  });
                  if (!res.ok) {
                    setError(await responseError(res, "Failed to update poster"));
                    return;
                  }
                  const updated = await res.json();
                  setEvent({ ...event, ...updated, startsAt: new Date(updated.startsAt) });
                } catch {
                  setError("Network error. Please try again.");
                }
              }}
            />
          </div>
        </div>

        <div className="mt-lg">
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Status</p>
          <div className="mt-sm flex flex-wrap gap-sm">
            {STATUS_OPTIONS.map((s) => {
              const blocked =
                !flatFeePaid && (s === "PUBLISHED" || s === "LIVE");
              return (
                <button
                  key={s}
                  type="button"
                  title={blocked ? "Pay the flat fee first" : undefined}
                  disabled={blocked || saving}
                  className={`border px-md py-sm text-button-md font-bold uppercase disabled:cursor-not-allowed disabled:opacity-40 ${
                    event.status === s
                      ? "border-accent bg-accent text-paper"
                      : "border-line bg-paper text-ink hover:border-accent"
                  }`}
                  onClick={() => handleStatusChange(s)}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="mt-md text-body-sm text-accent">{error}</p>}
        <button
          className="mt-lg border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper disabled:opacity-60"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <div className="space-y-md">
        <div className="border border-line p-lg">
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Stats</p>
          <div className="mt-md space-y-sm">
            <div className="flex justify-between text-body-sm">
              <span>Categories</span>
              <span className="font-mono text-accent">{event.categories.length}</span>
            </div>
            <div className="flex justify-between text-body-sm">
              <span>Registrations</span>
               <span className="font-mono text-accent">{totalRegistrations} entries</span>
             </div>
             <div className="flex justify-between text-body-sm">
               <span>Dancers / members</span>
               <span className="font-mono text-accent">{totalMembers}</span>
            </div>
            <div className="flex justify-between text-body-sm">
              <span>Judge slots</span>
              <span className="font-mono text-accent">{totalJudgeSlots}</span>
            </div>
          </div>
        </div>

        <div className="border border-line p-lg">
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Billing</p>
          <div className="mt-md space-y-sm">
            <div className="flex justify-between text-body-sm">
              <span>Flat fee</span>
              {flatFeePaid ? (
                <span className="font-mono text-accent">{formatInr(event.flatFee ?? 0)} paid</span>
              ) : (
                <span className="font-mono text-accent">
                  <Link href={`/organizer/${event.id}/bill`} className="underline">
                    {formatInr(event.flatFee ?? 0)} — pay
                  </Link>
                </span>
              )}
            </div>
            <div className="flex justify-between text-body-sm">
              <span>Commission</span>
              {event.commissionDue != null && event.commissionDue > 0 ? (
                <span className="font-mono text-accent">{formatInr(event.commissionDue)}</span>
              ) : (
                <span className="font-mono text-ink-muted">2.99% at completion</span>
              )}
            </div>
          </div>

          {event.commissionDue != null && event.commissionDue > 0 && !event.commissionPaid ? (
            <div className="mt-md border border-accent bg-paper p-md">
              {event.commissionPaymentStatus === "PENDING" ? (
                <div>
                  <p className="text-body-sm font-bold uppercase text-accent">
                    Commission sent — waiting for confirmation
                  </p>
                  <p className="mt-xs text-body-sm text-ink-muted">
                    We&apos;re verifying your transfer
                    {event.commissionPaymentSentAt ? ` sent ${new Date(event.commissionPaymentSentAt).toLocaleString()}` : ""}.
                    Refresh this page later.
                  </p>
                  <Link
                    href={`/organizer/${event.id}/bill#commission`}
                    className="mt-md inline-block border border-line px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-ink hover:border-accent hover:text-accent"
                  >
                    View bill
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-body-sm font-bold uppercase text-accent">
                    Commission not paid — {formatInr(event.commissionDue)}
                  </p>
                  <p className="mt-xs text-body-sm text-ink-muted">
                    Settle the 2.99% commission on confirmed entries before marking the event Completed.
                  </p>
                  <Link
                    href={`/organizer/${event.id}/bill#commission`}
                    className="mt-md inline-block border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
                  >
                    Pay commission
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          {event.commissionPaid ? (
            <p className="mt-md border border-accent bg-accent/10 px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.1em] text-accent">
              Commission paid — {formatInr(event.commissionDue ?? 0)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
    </div>
  );
}

function CategoriesTab({
  event,
  refresh,
  refreshing,
}: {
  event: EventWithRelations;
  refresh: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="space-y-xl">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
          {event.categories.length} categor{event.categories.length === 1 ? "y" : "ies"}
        </p>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="border border-line px-md py-xs font-mono text-[0.65rem] uppercase text-ink-muted hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      {event.categories.map((category) => (
        <div key={category.id} className="border border-line p-lg">
          <div className="flex flex-wrap items-start justify-between gap-md">
            <div>
              <p className="font-display text-title-md uppercase">
                {category.name}
              </p>
              <p className="mt-xs text-body-sm text-ink-muted">
                {category._count.registrations} entries · {formatLabel(category.format ?? (isCompetitionType(event.eventType) ? "SOLO" : "BATTLE_1V1"))} · {category.minMembers === category.maxMembers ? category.minMembers : `${category.minMembers}–${category.maxMembers}`} members
              </p>
            </div>
             <CategoryFeeEditor category={category} eventType={event.eventType} refresh={refresh} />
          </div>

          {category.rounds.length > 0 && (
            <div className="mt-lg">
              <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                Round phases
              </p>
                <div className="mt-sm space-y-sm">
                  {category.rounds.map((round) => (
                    <RoundEditor
                      key={round.id}
                      categoryId={category.id}
                      eventType={event.eventType}
                      round={round}
                      refresh={refresh}
                    />
                  ))}
                </div>
            </div>
          )}

          <AddRoundForm categoryId={category.id} eventType={event.eventType} refresh={refresh} />
        </div>
      ))}

      <AddCategoryForm eventId={event.id} eventType={event.eventType} refresh={refresh} />
    </div>
  );
}

function CategoryFeeEditor({
  category,
  eventType,
  refresh,
}: {
  category: Category;
  eventType: string | null;
  refresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState(category.entryFee?.toString() ?? "");
  const [currency, setCurrency] = useState(category.entryCurrency);
  const [format, setFormat] = useState<string>(category.format ?? (isCompetitionType(eventType) || isWorkshopType(eventType) ? "SOLO" : "BATTLE_1V1"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryFee: fee ? Number(fee) : null,
          entryCurrency: currency || "INR",
          format,
        }),
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed to update price"));
        return;
      }
      setEditing(false);
      refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="text-right">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-accent">
          {category.entryFee && category.entryFee > 0
            ? `${category.entryCurrency === "INR" ? "₹" : `${category.entryCurrency} `}${category.entryFee}`
            : "Free entry"}
        </p>
        <button
          className="mt-sm border border-line px-sm py-xs text-[0.7rem] font-bold uppercase hover:border-accent"
          onClick={() => {
            setFee(category.entryFee?.toString() ?? "");
            setCurrency(category.entryCurrency);
            setFormat(category.format ?? (isCompetitionType(eventType) || isWorkshopType(eventType) ? "SOLO" : "BATTLE_1V1"));
            setEditing(true);
          }}
          type="button"
        >
          Edit price
        </button>
      </div>
    );
  }

  return (
    <div className="border border-line bg-paper-soft p-md">
      <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
        Entry price point
      </p>
      <div className="mt-sm flex flex-wrap items-center gap-sm">
         <input
          className="w-28 border border-line bg-paper px-sm py-xs text-body-sm"
          type="number"
          min={0}
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          placeholder="Fee"
        />
        <input
          className="w-20 border border-line bg-paper px-sm py-xs text-body-sm"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          placeholder="INR"
           maxLength={8}
         />
        <select className="border border-line bg-paper px-sm py-xs text-body-sm" value={format} onChange={(e) => setFormat(e.target.value)}>
          {(isCompetitionType(eventType) ? COMPETITION_FORMATS : isWorkshopType(eventType) ? ["SOLO"] : BATTLE_FORMATS).map((option) => <option key={option} value={option}>{CATEGORY_FORMAT_LABELS[option as keyof typeof CATEGORY_FORMAT_LABELS]}</option>)}
        </select>
        <button
          className="border border-accent bg-accent px-md py-xs text-[0.7rem] font-bold uppercase text-paper disabled:opacity-60"
          disabled={saving}
          onClick={() => void handleSave()}
          type="button"
        >
          {saving ? "..." : "Save"}
        </button>
        <button
          className="border border-line px-md py-xs text-[0.7rem] font-bold uppercase hover:border-accent"
          onClick={() => setEditing(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-sm text-body-sm text-accent">{error}</p>}
    </div>
  );
}

function RoundEditor({
  categoryId,
  eventType,
  round,
  refresh,
}: {
  categoryId: string;
  eventType: string | null;
  round: Round;
  refresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<RoundType>(round.type);
  const [label, setLabel] = useState(round.label ?? "");
  const [roundCount, setRoundCount] = useState(String(round.roundCount));
  const [roundDuration, setRoundDuration] = useState(round.roundDuration?.toString() ?? "");
  const [advanceCount, setAdvanceCount] = useState(round.advanceCount?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openEditor() {
    setType(round.type);
    setLabel(round.label ?? "");
    setRoundCount(String(round.roundCount));
    setRoundDuration(round.roundDuration?.toString() ?? "");
    setAdvanceCount(round.advanceCount?.toString() ?? "");
    setError("");
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/categories/${categoryId}/rounds/${round.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          label: label.trim() || null,
          roundCount: Number(roundCount) || 1,
          roundDuration: roundDuration ? Number(roundDuration) : null,
          advanceCount: advanceCount ? Number(advanceCount) : null,
        }),
      });

      if (!res.ok) {
        setError(await responseError(res, "Failed to update phase"));
        return;
      }

      setEditing(false);
      refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-sm border border-line bg-paper-soft px-md py-sm">
        <div className="text-body-sm">
          <span className="font-mono uppercase text-accent">{round.type}</span>{" "}
          {round.label && <span className="text-ink-muted">&mdash; {round.label}</span>}
          <span className="ml-sm text-ink-muted">
            ({round.roundCount} round{round.roundCount > 1 ? "s" : ""}
            {round.roundDuration ? `, ${round.roundDuration}s` : ""}
            {round.advanceCount != null ? `, advance ${round.advanceCount}` : ""})
          </span>
          {round.phaseStatus && round.phaseStatus !== "PENDING" && (
            <span className="ml-sm font-mono text-[0.6rem] uppercase text-ink-muted">[{round.phaseStatus}]</span>
          )}
        </div>
        <div className="flex gap-xs">
          <button
            className="border border-line px-sm py-xs text-[0.7rem] font-bold uppercase hover:border-accent"
            onClick={openEditor}
            type="button"
          >
            Edit phase
          </button>
          <DeleteRoundButton categoryId={categoryId} roundId={round.id} refresh={refresh} />
        </div>
      </div>
    );
  }

  const phaseTypes = isCompetitionType(eventType) ? SINGLE_POINT_ROUND_TYPES : ROUND_TYPES;

  return (
    <div className="border border-accent bg-paper-soft p-md">
      <div className="grid gap-sm sm:grid-cols-2">
        <select
          className="border border-line bg-paper px-md py-sm text-body-sm"
          value={type}
          onChange={(event) => setType(event.target.value as RoundType)}
        >
          {phaseTypes.map((phaseType) => (
            <option key={phaseType} value={phaseType}>{phaseType}</option>
          ))}
        </select>
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Label (e.g. Top 16)"
        />
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm"
          type="number"
          min={1}
          value={roundCount}
          onChange={(event) => setRoundCount(event.target.value)}
          placeholder="Round count"
        />
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm"
          type="number"
          min={1}
          value={roundDuration}
          onChange={(event) => setRoundDuration(event.target.value)}
          placeholder="Duration (seconds)"
        />
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm sm:col-span-2"
          type="number"
          min={0}
          value={advanceCount}
          onChange={(event) => setAdvanceCount(event.target.value)}
          placeholder="Advance count"
        />
      </div>
      {error && <p className="mt-sm text-body-sm text-accent">{error}</p>}
      <div className="mt-md flex gap-sm">
        <button
          className="border border-accent bg-accent px-md py-xs text-[0.7rem] font-bold uppercase text-paper disabled:opacity-60"
          disabled={saving}
          onClick={() => void handleSave()}
          type="button"
        >
          {saving ? "Saving..." : "Save phase"}
        </button>
        <button
          className="border border-line px-md py-xs text-[0.7rem] font-bold uppercase hover:border-accent"
          onClick={() => setEditing(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function DeleteRoundButton({
  categoryId,
  roundId,
  refresh,
}: {
  categoryId: string;
  roundId: string;
  refresh: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/categories/${categoryId}/rounds/${roundId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed to delete phase"));
        return;
      }
      refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div>
      <button
        className="border border-line px-sm py-xs text-[0.7rem] font-bold uppercase text-accent hover:border-accent disabled:opacity-60"
        disabled={deleting}
        onClick={() => void handleDelete()}
        type="button"
      >
        {deleting ? "..." : "Delete"}
      </button>
      {error ? <p className="mt-xs text-[0.65rem] text-accent">{error}</p> : null}
    </div>
  );
}

function AddRoundForm({
  categoryId,
  eventType,
  refresh,
}: {
  categoryId: string;
  eventType: string | null;
  refresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/categories/${categoryId}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.get("type"),
          label: form.get("label") || undefined,
          roundCount: Number(form.get("roundCount")) || 1,
          roundDuration: form.get("roundDuration")
            ? Number(form.get("roundDuration"))
            : undefined,
          advanceCount: form.get("advanceCount")
            ? Number(form.get("advanceCount"))
            : undefined,
        }),
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed to add round"));
        return;
      }
      setOpen(false);
      refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        className="mt-md border border-line px-md py-sm text-body-sm font-bold uppercase hover:border-accent"
        onClick={() => setOpen(true)}
        type="button"
      >
        + Add round phase
      </button>
    );
  }

  return (
    <form className="mt-md border border-line bg-paper-soft p-md" onSubmit={handleSubmit}>
      <div className="grid gap-sm sm:grid-cols-2">
        <select
          className="border border-line bg-paper px-md py-sm text-body-sm"
          name="type"
          required
        >
          <option value="">Select round type</option>
          {(isCompetitionType(eventType) ? SINGLE_POINT_ROUND_TYPES : ROUND_TYPES).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm"
          name="label"
          placeholder="Label (e.g. Top 16)"
        />
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm"
          name="roundCount"
          type="number"
          min={1}
          defaultValue={1}
          placeholder="Round count"
        />
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm"
          name="roundDuration"
          type="number"
          min={1}
          placeholder="Duration (seconds)"
        />
        <input
          className="border border-line bg-paper px-md py-sm text-body-sm sm:col-span-2"
          name="advanceCount"
          type="number"
          min={0}
          placeholder="Advance count"
        />
      </div>
      {error && <p className="mt-sm text-body-sm text-accent">{error}</p>}
      <div className="mt-md flex gap-sm">
        <button
          className="border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Adding..." : "Add"}
        </button>
        <button
          className="border border-line px-md py-sm font-bold uppercase hover:border-accent"
          onClick={() => setOpen(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddCategoryForm({
  eventId,
  eventType,
  refresh,
}: {
  eventId: string;
  eventType: string | null;
  refresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [format, setFormat] = useState(
    isCompetitionType(eventType) ? "SOLO" : "BATTLE_1V1",
  );

  const roster = defaultRosterSize(format);
  const fixedSize = roster.min === roster.max;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/events/${eventId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          format,
          maxCompetitors: form.get("maxCompetitors")
            ? Number(form.get("maxCompetitors"))
            : null,
          entryFee: form.get("entryFee") ? Number(form.get("entryFee")) : null,
          prizeAmount: form.get("prizeAmount")
            ? Number(form.get("prizeAmount"))
            : null,
        }),
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed to add category"));
        return;
      }
      setOpen(false);
      refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        className="border border-line px-md py-sm text-body-sm font-bold uppercase hover:border-accent"
        onClick={() => setOpen(true)}
        type="button"
      >
        + Add category
      </button>
    );
  }

  return (
    <form className="border border-line p-lg" onSubmit={handleSubmit}>
      <p className="font-display text-title-md uppercase">New category</p>
      <div className="mt-lg flex flex-wrap gap-sm">
        <input
          className="min-w-48 border border-line bg-paper px-md py-sm text-body-sm"
          name="name"
          required
          placeholder="Category name"
        />
        <select
          className="border border-line bg-paper px-md py-sm text-body-sm"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          name="format"
        >
          {(isCompetitionType(eventType) ? COMPETITION_FORMATS : BATTLE_FORMATS).map((f) => (
            <option key={f} value={f}>{CATEGORY_FORMAT_LABELS[f]}</option>
          ))}
        </select>
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Maximum participants</span>
          <input
            className="w-36 border border-line bg-paper px-md py-sm text-body-sm"
            name="maxCompetitors"
            type="number"
            min={1}
            placeholder="e.g. 16"
          />
          <span className="mt-xs block font-mono text-[0.6rem] uppercase tracking-[0.08em] text-ink-muted">
            Max teams. Blank = unlimited.
          </span>
        </label>
        <span className="mb-xs self-center border border-line px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">
          {fixedSize ? `${roster.min} per entry` : `${roster.min}–${roster.max} per entry`}
        </span>
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Entry fee (₹)</span>
          <input
            className="w-32 border border-line bg-paper px-md py-sm text-body-sm"
            name="entryFee"
            type="number"
            min={0}
            placeholder="e.g. 500"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[0.7rem] uppercase text-ink-muted">Prize pool (₹)</span>
          <input
            className="w-32 border border-line bg-paper px-md py-sm text-body-sm"
            name="prizeAmount"
            type="number"
            min={0}
            placeholder="e.g. 50000"
          />
        </label>
      </div>
      {error && <p className="mt-sm text-body-sm text-accent">{error}</p>}
      <div className="mt-md flex gap-sm">
        <button
          className="border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Adding..." : "Create"}
        </button>
        <button
          className="border border-line px-md py-sm font-bold uppercase hover:border-accent"
          onClick={() => setOpen(false)}
          type="button"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function JudgesTab({
  event,
  refresh,
}: {
  event: EventWithRelations;
  refresh: () => void;
}) {
  return (
    <div className="space-y-xl">
      {event.categories.map((category) => (
        <div key={category.id} className="border border-line p-lg">
          <div className="flex flex-wrap items-center justify-between gap-md">
            <p className="font-display text-title-md uppercase">
              {category.name}
            </p>
          </div>

          <JudgeCodeForm
            eventId={event.id}
            categoryId={category.id}
            refresh={refresh}
          />

          {category.judgeSlots.length === 0 ? (
            <p className="mt-lg text-body-sm text-ink-muted">
              No judge slots yet.
            </p>
          ) : (
            <div className="mt-lg space-y-sm">
              {category.judgeSlots.map((slot) => (
                <JudgeSlotRow key={slot.id} slot={slot} refresh={refresh} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function JudgeCodeForm({
  eventId,
  categoryId,
  refresh,
}: {
  eventId: string;
  categoryId: string;
  refresh: () => void;
}) {
  const [mode, setMode] = useState<"directory" | "manual">("directory");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string | null; style: string | null; crew: string | null; city: string | null }>>([]);
  const [selected, setSelected] = useState<{ id: string; name: string | null } | null>(null);
  const [manualName, setManualName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "directory" || query.trim().length < 2) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/artists/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) {
          if (active) setError(await responseError(res, "Failed to search artists."));
          return;
        }
        if (active) setResults(await res.json());
      } catch {
        if (active) setError("Network error. Please try again.");
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, mode]);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setGeneratedCode(null);

    const body: { categoryId: string; name?: string; judgeUserId?: string } = { categoryId };
    if (mode === "directory" && selected) {
      body.judgeUserId = selected.id;
      if (selected.name) body.name = selected.name;
    } else if (mode === "manual" && manualName.trim()) {
      body.name = manualName.trim();
    }

    if (!body.judgeUserId && !body.name) {
      setError("Pick an artist or enter a name.");
      setGenerating(false);
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}/judge-slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setError(await responseError(res, "Failed to generate code."));
        return;
      }
      const data = await res.json();
      setGeneratedCode(data.code);
      setSelected(null);
      setManualName("");
      setQuery("");
      setResults([]);
      refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function copyCode() {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-lg border border-line bg-paper-soft p-md">
      <div className="flex flex-wrap items-center gap-sm">
        <button
          type="button"
          className={`border px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] ${
            mode === "directory" ? "border-accent bg-accent/10 text-accent" : "border-line text-ink-muted hover:border-accent"
          }`}
          onClick={() => setMode("directory")}
        >
          From artist directory
        </button>
        <button
          type="button"
          className={`border px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] ${
            mode === "manual" ? "border-accent bg-accent/10 text-accent" : "border-line text-ink-muted hover:border-accent"
          }`}
          onClick={() => setMode("manual")}
        >
          Manual name
        </button>
      </div>

      <div className="mt-md flex flex-wrap items-end gap-sm">
        {mode === "directory" ? (
          <div className="min-w-64 flex-1">
            <input
              className="w-full border border-line bg-paper px-md py-sm text-body-sm"
              placeholder={selected?.name ?? "Search artists..."}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected) setSelected(null);
                if (e.target.value.trim().length < 2) setResults([]);
              }}
            />
            {!selected && results.length > 0 ? (
              <ul className="mt-xs border border-line bg-paper">
                {results.map((artist) => (
                  <li key={artist.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-sm px-md py-sm text-left text-body-sm hover:bg-paper-soft"
                      onClick={() => {
                        setSelected({ id: artist.id, name: artist.name });
                        setQuery("");
                        setResults([]);
                      }}
                    >
                      <span className="font-bold uppercase">{artist.name ?? "Unnamed"}</span>
                      <span className="font-mono text-[0.65rem] uppercase text-ink-muted">
                        {[artist.style, artist.crew, artist.city].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <input
            className="min-w-64 flex-1 border border-line bg-paper px-md py-sm text-body-sm"
            placeholder="Judge name (outsider / abroad)"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
          />
        )}
        <button
          type="button"
          className="border border-line px-md py-sm text-body-sm font-bold uppercase hover:border-accent disabled:opacity-60"
          disabled={generating}
          onClick={() => void handleGenerate()}
        >
          {generating ? "..." : "+ Generate code"}
        </button>
      </div>

      {error ? <p className="mt-sm text-body-sm text-accent">{error}</p> : null}

      {generatedCode && (
        <div className="mt-md flex flex-wrap items-center gap-sm">
          <code className="border border-accent bg-paper-soft px-md py-sm font-mono text-display-lg text-accent">
            {generatedCode}
          </code>
          <button
            className="border border-line px-md py-sm text-body-sm font-bold uppercase hover:border-accent"
            onClick={() => void copyCode()}
            type="button"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

function JudgeSlotRow({
  slot,
  refresh,
}: {
  slot: JudgeSlot;
  refresh: () => void;
}) {
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState("");

  async function handleToggle() {
    setToggling(true);
    setError("");
    try {
      const res = await fetch(`/api/judge-slots/${slot.code}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !slot.isActive }),
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed to update judge slot"));
        return;
      }
      refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-sm border border-line bg-paper-soft px-md py-sm">
      <div className="text-body-sm">
        <code className="font-mono text-accent">{slot.code}</code>
        {slot.name && (
          <span className="ml-sm text-ink-muted">{slot.name}</span>
        )}
        {error ? <p className="mt-xs text-[0.65rem] text-accent">{error}</p> : null}
      </div>
      <button
        className={`border px-md py-xs text-[0.7rem] font-bold uppercase disabled:opacity-60 ${
          slot.isActive
            ? "border-line text-ink hover:border-accent"
            : "border-accent bg-accent text-paper"
        }`}
        disabled={toggling}
        onClick={() => void handleToggle()}
        type="button"
      >
        {slot.isActive ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}

function CypherDancerPicker({ eventId, categoryId, onResult }: { eventId: string; categoryId: string; onResult: (ok: boolean, message?: string) => void }) {
  const router = useRouter();
  const [regs, setRegs] = useState<Array<{ id: string; user: { name: string | null }; teamName?: string | null; crew: string | null; seed: number | null; dancerScores: Array<{ score: number }>; members?: Array<{ status: string; user: { name: string | null; username: string | null } }> }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/registrations?categoryId=${categoryId}&status=CONFIRMED`);
        if (!res.ok) {
          if (!cancelled) setError(await responseError(res, "Failed to load entries."));
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setRegs(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch {
        if (!cancelled) setError("Network error. Please try again.");
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [eventId, categoryId]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const advance = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/categories/${categoryId}/cypher-advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationIds: Array.from(selected) }),
      });
      if (res.ok) {
        setSelected(new Set());
        router.refresh();
        onResult(true);
      } else {
        onResult(false, await responseError(res, "Failed to advance"));
      }
    } catch {
      onResult(false, "Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-lg border-t border-line pt-md">
       <p className="font-mono text-[0.7rem] uppercase text-ink-muted mb-xs">Select entries to advance</p>
       <p className="mb-md text-body-sm text-ink-muted">
          Tick complete entries that move to the next round, then confirm.
       </p>
       {error ? <p className="mb-md text-body-sm text-accent">{error}</p> : null}
      {[...regs]
        .sort((a, b) => {
          const ta = a.dancerScores.reduce((s, d) => s + d.score, 0);
          const tb = b.dancerScores.reduce((s, d) => s + d.score, 0);
          return tb - ta;
        })
        .map(reg => {
        const total = reg.dancerScores.reduce((s, d) => s + d.score, 0);
        const judgeCount = reg.dancerScores.length;
        return (
          <label key={reg.id} className="flex items-center gap-sm py-xs text-body-sm">
            <input type="checkbox" checked={selected.has(reg.id)} onChange={() => toggle(reg.id)} className="border border-line bg-paper" />
            <span className="w-10 font-mono text-xs text-ink-muted">#{reg.seed ?? "-"}</span>
             <span className="flex-1">{reg.teamName ?? reg.user.name} {reg.members && reg.members.length > 1 ? <span className="ml-sm text-xs text-ink-muted">({reg.members.filter((member) => member.status === "ACCEPTED").map((member) => member.user.name ?? member.user.username).join(" · ")})</span> : reg.crew ? `(${reg.crew})` : ''}</span>
            <span className="font-mono text-sm text-accent">{judgeCount > 0 ? total : "—"}</span>
            <span className="w-20 text-right text-xs text-ink-muted">{judgeCount > 0 ? `${judgeCount} judge${judgeCount > 1 ? "s" : ""}` : "no score"}</span>
          </label>
        );
      })}
      <button
        className="mt-md border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => void advance()}
        disabled={busy || selected.size === 0}
      >
         Advance {selected.size} entr{selected.size === 1 ? "y" : "ies"}
      </button>
    </div>
  );
}

const MESSAGE_TEMPLATES = [
  {
    id: "event_reminder",
    label: "Event reminder",
    text: (eventTitle: string, date: string, venue: string | null, city: string | null) =>
      `Hi! Just a reminder about "${eventTitle}" on ${date}${venue ? ` at ${venue}` : ""}${city ? `, ${city}` : ""}. We're excited to see you there!`,
  },
  {
    id: "checkin_reminder",
    label: "Check-in reminder",
    text: (eventTitle: string, date: string, venue: string | null, city: string | null) =>
      `Reminder: Check-in for "${eventTitle}" starts soon on ${date}${venue ? ` at ${venue}` : ""}${city ? `, ${city}` : ""}. Please arrive early to complete registration.`,
  },
  {
    id: "payment_reminder",
    label: "Payment reminder",
    text: (eventTitle: string, amount?: number, currency?: string) =>
      `Reminder: Your entry fee for "${eventTitle}" ${amount ? `(${currency ?? "INR"} ${amount})` : ""} is still pending. Please complete payment to confirm your spot.`,
  },
  {
    id: "venue_details",
    label: "Venue & arrival details",
    text: (eventTitle: string, date: string, venue: string | null, address: string | null) =>
      `Venue details for "${eventTitle}" on ${date}: ${venue ?? "TBA"}${address ? ` - ${address}` : ""}. Please plan your travel accordingly.`,
  },
  {
    id: "schedule_reminder",
    label: "Schedule reminder",
    text: (eventTitle: string, date: string) =>
      `Schedule update for "${eventTitle}" on ${date}: Please check the event page for the latest timing and running order.`,
  },
  {
    id: "last_call",
    label: "Last call / registration confirmation",
    text: (eventTitle: string, date: string) =>
      `Last call for "${eventTitle}" on ${date}! Registrations close soon. Confirm your spot now if you haven't already.`,
  },
  {
    id: "bring_id_music",
    label: "Bring ID & music reminder",
    text: (eventTitle: string, date: string) =>
      `Important for "${eventTitle}" on ${date}: Please bring a valid photo ID and your music files (USB/phone) for the competition.`,
  },
  {
    id: "roster_confirmation",
    label: "Team roster confirmation",
    text: (eventTitle: string, teamName: string, members: string[]) =>
      `Team "${teamName}" confirmed for "${eventTitle}". Members: ${members.join(", ")}. Please ensure all members have accepted their invitations.`,
  },
];

function RegistrationsTab({ event }: { event: EventWithRelations }) {
  const [categoryId, setCategoryId] = useState(event.categories[0]?.id ?? "");
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(event.categories.length > 0);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/events/${event.id}/registrations?categoryId=${categoryId}`);
        if (!res.ok) {
          if (!cancelled) setError(await responseError(res, "Failed to load registrations."));
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setRegistrations(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch {
        if (!cancelled) setError("Network error. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [categoryId, event.id]);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/events/${event.id}/registrations?categoryId=${categoryId}`);
        if (!res.ok) {
          if (!cancelled) setError(await responseError(res, "Failed to refresh registrations."));
          return;
        }
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setRegistrations(data);
          setError("");
        }
      } catch {
        if (!cancelled) setError("Network error. Please try again.");
      }
    };
    const interval = window.setInterval(() => void load(), 5000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [categoryId, event.id]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/events/${event.id}/registrations?categoryId=${categoryId}`);
      if (!res.ok) {
        setError(await responseError(res, "Failed to refresh registrations."));
        return;
      }
      const data = await res.json();
      setRegistrations(Array.isArray(data) ? data : []);
      setError("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }

  const filteredRegistrations = registrations.filter((reg) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const memberNames = reg.members?.map((m) => m.user.name ?? "").join(" ") ?? "";
    const searchText = [
      reg.user.name,
      reg.user.email,
      reg.teamName,
      reg.crew,
      memberNames,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchText.includes(q);
  });

  return (
    <div>
      <div className="mb-lg flex flex-wrap items-center gap-sm">
        <label className="font-mono text-[0.7rem] uppercase text-ink-muted">
          Filter by category
        </label>
        <select
          className="border border-line bg-paper px-md py-sm text-body-sm"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {event.categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search name, email, crew, team, members..."
          className="border border-line bg-paper px-md py-sm text-body-sm flex-1 min-w-[200px] max-w-md"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <span className="text-body-sm text-ink-muted">
          ({filteredRegistrations.length} / {registrations.length} registrations)
        </span>
        {error ? <span className="text-body-sm text-accent">{error}</span> : null}
        <button
          className="ml-auto border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
          disabled={refreshing}
          onClick={() => void handleRefresh()}
          type="button"
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading ? (
        <p className="border border-line p-lg text-ink-muted">Loading...</p>
      ) : registrations.length === 0 ? (
        <p className="border border-line p-lg text-ink-muted">
          No registrations for this category.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-line text-body-sm">
            <thead>
              <tr className="border-b border-line bg-paper-soft text-left">
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">
                  Entry / roster
                </th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">
                  Crew
                </th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">
                  Style
                </th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">
                  Exp
                </th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">
                  Fee
                </th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">
                  Payment
                </th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">
                  Status
                </th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">
                  Seed
                </th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map((reg) => (
                <RegistrationRow
                  key={reg.id}
                  registration={reg}
                  event={event}
                  onUpdate={() => {
                    const url = `/api/events/${event.id}/registrations?categoryId=${categoryId}`;
                    fetch(url)
                      .then(async (r) => {
                        if (!r.ok) {
                          setError(await responseError(r, "Failed to refresh registrations."));
                          return [];
                        }
                        return r.json();
                      })
                      .then((data) => {
                        if (Array.isArray(data)) {
                          setRegistrations(data);
                          setError("");
                        }
                      })
                      .catch(() => {
                        setError("Network error. Please try again.");
                      });
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RegistrationRow({
  registration,
  event,
  onUpdate,
}: {
  registration: RegistrationRow;
  event: EventWithRelations;
  onUpdate: () => void;
}) {
  const [seed, setSeed] = useState(registration.seed?.toString() ?? "");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");

  const captainPhone = registration.user.whatsappNumber ?? registration.members?.find((m) => m.role === "CAPTAIN")?.user.whatsappNumber ?? null;
  const teamMembers = registration.members?.map((m) => m.user.name ?? "").filter(Boolean) ?? [];

  function buildMessage(templateId: string) {
    const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return "";
    const eventDate = event.startsAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    switch (templateId) {
      case "event_reminder":
      case "checkin_reminder":
        return (template.text as (title: string, date: string, venue: string | null, city: string | null) => string)(event.title, eventDate, event.venue, event.city);
      case "schedule_reminder":
        return (template.text as (title: string, date: string) => string)(event.title, eventDate);
      case "payment_reminder":
        return (template.text as (title: string, amount?: number, currency?: string) => string)(event.title, registration.entryFee ?? undefined, registration.entryCurrency ?? undefined);
      case "venue_details":
        return (template.text as (title: string, date: string, venue: string | null, address: string | null) => string)(event.title, eventDate, event.venue, event.googleMapsUrl);
      case "last_call":
        return (template.text as (title: string, date: string) => string)(event.title, eventDate);
      case "bring_id_music":
        return (template.text as (title: string, date: string) => string)(event.title, eventDate);
      case "roster_confirmation":
        return (template.text as (title: string, teamName: string, members: string[]) => string)(event.title, registration.teamName ?? registration.user.name ?? "Team", teamMembers);
      default:
        return "";
    }
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTemplateId(templateId);
    setCustomMessage(buildMessage(templateId));
  }

  function openWhatsApp() {
    if (!captainPhone) return;
    const cleaned = captainPhone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(customMessage)}`;
    window.open(url, "_blank");
  }

  async function patchRegistration(body: Record<string, unknown>) {
    setUpdating(true);
    setError("");
    try {
      const res = await fetch(`/api/registrations/${registration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        setError(errBody?.error ?? "Action failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setUpdating(false);
      onUpdate();
    }
  }

  async function handlePaid() {
    await patchRegistration({ paid: true });
  }

  async function handleWithdraw() {
    await patchRegistration({ status: "WITHDRAWN" });
  }

  async function handleSeed() {
    await patchRegistration({ seed: seed ? Number(seed) : null });
  }

  return (
    <tr className="border-b border-line hover:bg-paper-soft">
       <td className="px-md py-sm">
          <p className="font-bold uppercase">{registration.teamName ?? registration.user.name ?? "—"}</p>
          {registration.members && registration.members.length > 0 ? (
            <p className="mt-xs max-w-64 text-[0.7rem] text-ink-muted">
              {registration.members.map((member) => `${member.user.name ?? member.user.username ?? "Unnamed"} (${member.status.toLowerCase()})`).join(" · ")}
            </p>
          ) : <p className="mt-xs text-[0.7rem] text-ink-muted">{registration.user.email}</p>}
        </td>
       <td className="px-md py-sm">{registration.crew ?? "—"}</td>
       <td className="px-md py-sm">{registration.style ?? "—"}</td>
       <td className="px-md py-sm">{registration.experience ?? "—"}</td>
       <td className="px-md py-sm font-mono text-[0.7rem] uppercase">
         {registration.entryFee && registration.entryFee > 0
           ? `${registration.entryCurrency === "INR" ? "₹" : `${registration.entryCurrency} `}${registration.entryFee}`
           : "Free"}
       </td>
       <td className="px-md py-sm">
         {registration.paid ? (
           <span className="font-mono text-[0.7rem] uppercase text-accent">
             Paid
           </span>
         ) : registration.paidClaimedAt ? (
           <span className="border border-accent px-sm py-xs font-mono text-[0.7rem] uppercase text-accent">
             Claims paid
           </span>
         ) : (
           <span className="font-mono text-[0.7rem] uppercase text-ink-muted">
             —
           </span>
         )}
       </td>
       <td className="px-md py-sm">
         <span
           className={`font-mono text-[0.7rem] uppercase ${
             registration.status === "CONFIRMED"
               ? "text-accent"
               : registration.status === "WITHDRAWN"
                 ? "text-ink-muted"
                 : ""
           }`}
         >
           {registration.status}
         </span>
       </td>
       <td className="px-md py-sm">
         <div className="flex items-center gap-xs">
           <input
             className="w-16 border border-line bg-paper px-sm py-xs text-body-sm"
             type="number"
             value={seed}
             onChange={(e) => setSeed(e.target.value)}
             onBlur={handleSeed}
             min={1}
           />
         </div>
       </td>
       <td className="px-md py-sm">
         <div className="flex flex-col gap-xs">
           <div className="flex gap-xs">
             <button
               className="border border-accent px-sm py-xs text-[0.7rem] font-bold uppercase text-accent hover:bg-accent hover:text-paper disabled:opacity-60"
               disabled={updating || registration.paid || registration.status === "WITHDRAWN"}
               onClick={() => void handlePaid()}
               type="button"
             >
               {registration.paid ? "Paid" : "Mark paid"}
             </button>
             <button
               className="border border-line px-sm py-xs text-[0.7rem] font-bold uppercase text-ink-muted hover:border-accent disabled:opacity-60"
               disabled={updating || registration.status === "WITHDRAWN"}
               onClick={() => void handleWithdraw()}
               type="button"
             >
               Reject
             </button>
           </div>
           {error ? <span className="text-[0.65rem] uppercase text-accent">{error}</span> : null}
           <div className="flex flex-col gap-xs mt-xs">
             <button
               type="button"
               className="border border-line px-sm py-xs text-[0.7rem] font-bold uppercase text-ink-muted hover:border-accent hover:text-accent"
               onClick={() => setShowMessage((v) => !v)}
             >
               {showMessage ? "Hide message" : "Message artist"}
             </button>
             {showMessage && (
               <div className="flex flex-col gap-xs px-xs">
                 <select
                   className="border border-line bg-paper px-sm py-xs text-[0.7rem] text-ink"
                   value={selectedTemplateId}
                   onChange={(e) => handleTemplateChange(e.target.value)}
                 >
                   <option value="">Select a template...</option>
                   {MESSAGE_TEMPLATES.map((t) => (
                     <option key={t.id} value={t.id}>{t.label}</option>
                   ))}
                 </select>
                 <textarea
                   className="border border-line bg-paper px-sm py-xs text-[0.7rem] text-ink min-h-[60px] max-h-[120px] resize-y"
                   value={customMessage}
                   onChange={(e) => setCustomMessage(e.target.value)}
                   placeholder="Edit message before sending..."
                 />
                 <button
                   type="button"
                   className="border border-accent bg-accent px-sm py-xs text-[0.7rem] font-bold uppercase text-paper hover:opacity-90 disabled:opacity-60"
                   disabled={!captainPhone || !customMessage.trim()}
                   onClick={openWhatsApp}
                 >
                   {captainPhone ? "Open WhatsApp" : "No WhatsApp number"}
                 </button>
               </div>
             )}
           </div>
         </div>
       </td>
     </tr>
  );
}

function PrizesTab({
  event,
  refresh,
}: {
  event: EventWithRelations;
  refresh: () => void;
}) {
  return (
    <div className="space-y-xl">
      {event.categories.map((category) => (
        <PrizePoolSection
          key={category.id}
          category={category}
          refresh={refresh}
        />
      ))}
    </div>
  );
}

type DistributionEntry = { rank: number; label: string; percentage: number };

function PrizePoolSection({
  category,
  refresh,
}: {
  category: Category;
  refresh: () => void;
}) {
  const initialDistribution: DistributionEntry[] = category.prizePool
    ? (category.prizePool.distribution as DistributionEntry[])
    : [];
  const [totalAmount, setTotalAmount] = useState(
    category.prizePool?.totalAmount?.toString() ?? "",
  );
  const [currency, setCurrency] = useState(category.prizePool?.currency ?? "USD");
  const [distribution, setDistribution] =
    useState<DistributionEntry[]>(initialDistribution);
  const [isPaid, setIsPaid] = useState(category.prizePool?.isPaid ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const sum = distribution.reduce((s, d) => s + d.percentage, 0);
  const valid = sum === 100 || distribution.length === 0;

  function addEntry() {
    const nextRank = distribution.length + 1;
    const label =
      nextRank === 1
        ? "1st place"
        : nextRank === 2
          ? "2nd place"
          : nextRank === 3
            ? "3rd place"
            : `${nextRank}th place`;
    setDistribution([...distribution, { rank: nextRank, label, percentage: 0 }]);
  }

  function updateEntry(index: number, field: keyof DistributionEntry, value: string) {
    setDistribution((prev) =>
      prev.map((d, i) =>
        i === index ? { ...d, [field]: field === "percentage" ? Number(value) || 0 : value } : d,
      ),
    );
  }

  function removeEntry(index: number) {
    setDistribution((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch(`/api/categories/${category.id}/prize-pool`, {
        method: category.prizePool ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totalAmount: Number(totalAmount),
          currency,
          distribution,
          isPaid,
        }),
      });
      if (!res.ok) {
        setError(await responseError(res, "Failed to save prize pool"));
        return;
      }
      refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-line p-lg">
      <p className="font-display text-title-md uppercase">{category.name}</p>
      {!category.prizePool && (
        <p className="mt-sm text-body-sm text-ink-muted">No prize set</p>
      )}

      <div className="mt-lg grid gap-md md:grid-cols-2">
        <div>
          <label className="font-mono text-[0.7rem] uppercase text-ink-muted">
            Total amount
          </label>
          <input
            className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            type="number"
            min={0}
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
            placeholder="1000"
          />
        </div>
        <div>
          <label className="font-mono text-[0.7rem] uppercase text-ink-muted">
            Currency
          </label>
          <input
            className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-sm"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            placeholder="USD"
          />
        </div>
      </div>

      <div className="mt-lg">
        <label className="flex items-center gap-sm font-mono text-[0.7rem] uppercase text-ink-muted">
          <input
            type="checkbox"
            checked={isPaid}
            onChange={(e) => setIsPaid(e.target.checked)}
            className="border border-line bg-paper"
          />
          Paid
        </label>
      </div>

      <div className="mt-lg">
        <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
          Distribution
        </p>
        {distribution.length === 0 && (
          <p className="mt-sm text-body-sm text-ink-muted">
            No distribution entries.
          </p>
        )}
        <div className="mt-sm space-y-sm">
          {distribution.map((entry, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-sm border border-line bg-paper-soft px-md py-sm"
            >
              <span className="font-mono text-[0.7rem] text-ink-muted">
                #{entry.rank}
              </span>
              <input
                className="border border-line bg-paper px-sm py-xs text-body-sm"
                value={entry.label}
                onChange={(e) => updateEntry(i, "label", e.target.value)}
                placeholder="Label"
              />
              <input
                className="w-20 border border-line bg-paper px-sm py-xs text-body-sm"
                type="number"
                min={0}
                max={100}
                value={entry.percentage || ""}
                onChange={(e) => updateEntry(i, "percentage", e.target.value)}
                placeholder="%"
              />
              <span className="text-body-sm text-ink-muted">%</span>
              <button
                className="border border-line px-sm py-xs text-[0.7rem] font-bold uppercase text-accent hover:border-accent"
                onClick={() => removeEntry(i)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-sm flex flex-wrap items-center gap-sm">
          <button
            className="border border-line px-md py-sm text-body-sm font-bold uppercase hover:border-accent"
            onClick={addEntry}
            type="button"
          >
            + Add rank
          </button>
          {distribution.length > 0 && (
            <span
              className={`font-mono text-body-sm ${sum === 100 ? "text-accent" : "text-accent"}`}
            >
              {sum}%
            </span>
          )}
        </div>
      </div>

      {error && <p className="mt-md text-body-sm text-accent">{error}</p>}
      <button
        className="mt-lg border border-accent bg-accent px-lg py-sm font-bold uppercase text-paper disabled:opacity-60"
        disabled={submitting || !valid || !totalAmount}
        onClick={handleSave}
        type="button"
      >
        {submitting ? "Saving..." : category.prizePool ? "Update prize pool" : "Create prize pool"}
      </button>
    </div>
  );
}

type BracketMatch = {
  id: string;
  round: number;
  position: number;
  status: string;
  competitorA: { teamName: string | null; user: { name: string | null }; members: { user: { name: string | null; username: string | null } }[] } | null;
  competitorB: { teamName: string | null; user: { name: string | null }; members: { user: { name: string | null; username: string | null } }[] } | null;
  competitorAId: string | null;
  competitorBId: string | null;
  winnerId: string | null;
  scoreA: number;
  scoreB: number;
};

function BracketView({
  categoryId,
  eventId,
  phaseLabel,
  advanceCount,
}: {
  categoryId: string;
  eventId: string;
  phaseLabel: string;
  advanceCount: number | null;
}) {
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/categories/${categoryId}/bracket`);
      if (!res.ok) {
        setError(await responseError(res, "Failed to load bracket"));
        return;
      }
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch {
      setError("Network error. Please try again.");
    }
  }, [categoryId, eventId]);

  useEffect(() => {
    const initial = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/categories/${categoryId}/bracket`);
        if (!res.ok) {
          setError(await responseError(res, "Failed to load bracket"));
          return;
        }
        const data = await res.json();
        setMatches(Array.isArray(data) ? data : []);
      } catch {
        setError("Network error. Please try again.");
      }
    };
    void initial();
  }, [categoryId, eventId]);

  async function run(matchId: string, url: string, body?: unknown) {
    setBusy(matchId);
    setError("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        setError(await responseError(res, "Action failed"));
      }
      await load();
    } catch {
      setError("Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-lg border-t border-line pt-md">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[0.7rem] uppercase text-ink-muted mb-md">
          {phaseLabel} bracket matches{advanceCount != null ? ` · ${advanceCount} advance` : ""}
        </p>
        {error && <p className="mb-md text-body-sm text-accent">{error}</p>}
      </div>
      {matches.map(match => {
        const ready = match.competitorAId && match.competitorBId;
        const locked = match.status === "LOCKED";
        const live = match.status === "LIVE";
        const complete = match.status === "COMPLETE";
        return (
          <div key={match.id} className="mt-sm border border-line p-md">
            <div className="flex flex-wrap items-center justify-between gap-sm">
              <span className="font-mono text-[0.7rem] text-ink-muted">R{match.round} M{match.position} / {match.status}</span>
              <div className="flex flex-wrap gap-sm">
                {!complete && ready && !live && (
                  <button
                    type="button"
                    className="border border-accent px-md py-xs text-body-sm font-bold uppercase text-accent disabled:opacity-60"
                    disabled={busy === match.id}
                    onClick={() => void run(match.id, `/api/matches/${match.id}/push-live`)}
                  >
                    {busy === match.id ? "Pushing..." : "Push live"}
                  </button>
                )}
                {(live || locked) && (
                  <button
                    type="button"
                    className="border border-line px-md py-xs text-body-sm font-bold uppercase text-ink disabled:opacity-60"
                    disabled={busy === match.id}
                    onClick={() => void run(match.id, `/api/matches/${match.id}/lock`, { locked: !locked })}
                  >
                    {locked ? "Unlock voting" : "Lock voting"}
                  </button>
                )}
                {complete && match.winnerId && (
                  <span className="border border-accent px-md py-xs text-body-sm font-bold uppercase text-accent">
                    Winner locked
                  </span>
                )}
              </div>
            </div>
            <div className="mt-sm grid grid-cols-[1fr_auto_auto_auto_1fr] items-center gap-sm text-body-sm">
               <span className="text-right">{match.competitorA?.teamName ?? match.competitorA?.user.name ?? "TBD"}</span>
              <span className="font-mono text-[0.7rem] text-ink-muted">{match.scoreA}</span>
              <span className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase text-ink-muted">vs</span>
              <span className="font-mono text-[0.7rem] text-ink-muted">{match.scoreB}</span>
               <span>{match.competitorB?.teamName ?? match.competitorB?.user.name ?? "TBD"}</span>
            </div>
            {!complete && ready && (
              <div className="mt-sm flex flex-wrap items-center justify-center gap-sm">
                <button
                  type="button"
                  className="border border-accent px-md py-xs text-body-sm font-bold uppercase text-accent disabled:opacity-60"
                  disabled={busy === match.id}
                  onClick={() => void run(match.id, `/api/matches/${match.id}/complete`, { winnerId: match.competitorAId })}
                >
                   Winner: {match.competitorA?.teamName ?? match.competitorA?.user.name ?? "A"}
                </button>
                <button
                  type="button"
                  className="border border-[#2980FF] px-md py-xs text-body-sm font-bold uppercase text-[#2980FF] disabled:opacity-60"
                  disabled={busy === match.id}
                  onClick={() => void run(match.id, `/api/matches/${match.id}/complete`, { winnerId: match.competitorBId })}
                >
                   Winner: {match.competitorB?.teamName ?? match.competitorB?.user.name ?? "B"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
