"use client";

import { useEffect, useState } from "react";
import { ManualPayment } from "@/components/manual-payment";
import { GIG_CONNECTION_FEE, formatInr } from "@/lib/pricing";
import { whatsappLink, BILL_WHATSAPP_NUMBER } from "@/lib/payment";

type ConversationSummary = {
  id: string;
  gigTitle: string | null;
  otherParty: string;
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unlocked: boolean;
  agreementId: string | null;
};

type Thread = {
  id: string;
  gigTitle: string | null;
  organizerName: string;
  artistName: string;
  myId: string;
  messages: { id: string; senderId: string; body: string; createdAt: string }[];
};

export function MessagesPanel({ role }: { role: "ORGANIZER" | "ARTIST" }) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadConversations() {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversations(await res.json());
    setLoaded(true);
  }

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const res = await fetch("/api/conversations");
      if (cancelled) return;
      if (res.ok) setConversations(await res.json());
      setLoaded(true);
    }
    void poll();
    const interval = setInterval(() => void poll(), 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function openConversation(id: string) {
    const conv = conversations.find((c) => c.id === id);
    if (conv && !conv.unlocked) {
      setActiveId(id);
      setThread(null);
      return;
    }
    setActiveId(id);
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) setThread(await res.json());
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!thread || !draft.trim()) return;
    setSending(true);
    const res = await fetch(`/api/conversations/${thread.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim() }),
    });
    setSending(false);
    if (res.ok) {
      setDraft("");
      await openConversation(thread.id);
      await loadConversations();
    }
  }

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <div className="grid gap-md lg:grid-cols-[16rem_1fr]">
      <div className="border border-line bg-paper-soft p-md">
        <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Conversations</p>
        {!loaded ? (
          <p className="mt-sm text-body-sm text-ink-muted">Loading...</p>
        ) : conversations.length === 0 ? (
          <p className="mt-sm text-body-sm text-ink-muted">
            No conversations yet. They appear after an offer is accepted.
          </p>
        ) : (
          <ul className="mt-sm space-y-xs">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`w-full border px-sm py-xs text-left text-body-sm ${
                    activeId === c.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line hover:border-accent"
                  }`}
                  onClick={() => void openConversation(c.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="block font-bold uppercase">{c.otherParty}</span>
                    {!c.unlocked ? (
                      <span className="font-mono text-[0.6rem] uppercase text-red-400">Lock</span>
                    ) : null}
                  </div>
                  <span className="block truncate text-[0.7rem] text-ink-muted">
                    {c.gigTitle ?? "Gig"} — {c.lastMessage?.body ?? "No messages"}
                  </span>
                  {!c.unlocked ? (
                    <span className="block text-[0.65rem] text-ink-muted">
                      Chat locked — pay {formatInr(GIG_CONNECTION_FEE)} to unlock
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-line bg-paper-soft p-md">
        {!thread && !activeConv ? (
          <p className="text-body-sm text-ink-muted">Select a conversation to view messages.</p>
        ) : activeConv && !activeConv.unlocked ? (
          role === "ARTIST" ? (
            <div className="flex h-full flex-col">
              <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                Chat with {activeConv.otherParty}
              </p>
              <div className="mt-md flex-1 space-y-sm">
                <div className="border border-accent bg-accent/10 p-md">
                  <p className="text-body-sm font-bold uppercase text-accent">Chat is locked</p>
                  <p className="mt-xs text-body-sm text-ink-muted">
                    Pay the {formatInr(GIG_CONNECTION_FEE)} connection fee to unlock this chat.
                    Once verified, you and the organizer can message each other.
                  </p>
                </div>
                {activeConv.agreementId ? (
                  <ManualPayment
                    amount={GIG_CONNECTION_FEE}
                    note={`Connection fee — chat with ${activeConv.otherParty}`}
                    submitUrl={`/api/agreements/${activeConv.agreementId}/connection/submit`}
                    submitBody={{ method: "UPI" }}
                    buttonLabel="I've paid — send for verification"
                  />
                ) : null}
                <a
                  href={whatsappLink(
                    BILL_WHATSAPP_NUMBER,
                    `Hi CYPHR, I've paid ₹${GIG_CONNECTION_FEE} for the connection fee to chat with ${activeConv.otherParty} on "${activeConv.gigTitle ?? "gig"}". Attaching the payment screenshot for verification.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border border-line px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-ink-muted hover:border-accent hover:text-accent"
                >
                  Resend screenshot on WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                Chat with {activeConv.otherParty}
              </p>
              <div className="mt-md border border-accent bg-accent/10 p-md">
                <p className="text-body-sm font-bold uppercase text-accent">
                  Chat locked — awaiting artist payment
                </p>
                <p className="mt-xs text-body-sm text-ink-muted">
                  {activeConv.otherParty} needs to pay the {formatInr(GIG_CONNECTION_FEE)}
                  connection fee before you can exchange messages. The chat will unlock
                  automatically once the payment is verified.
                </p>
              </div>
            </div>
          )
        ) : thread ? (
          <div className="flex h-full flex-col">
            <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
              {thread.gigTitle ?? "Gig"} · with {thread.myId === thread.organizerName ? thread.artistName : thread.organizerName}
            </p>
            <div className="mt-md flex-1 space-y-sm overflow-y-auto">
              {thread.messages.length === 0 ? (
                <p className="text-body-sm text-ink-muted">No messages yet. Say hello.</p>
              ) : (
                thread.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] border px-md py-sm text-body-sm ${
                      m.senderId === thread.myId
                        ? "ml-auto border-accent bg-accent/10"
                        : "mr-auto border-line bg-paper"
                    }`}
                  >
                    {m.body}
                  </div>
                ))
              )}
            </div>
            <form className="mt-md flex gap-sm" onSubmit={sendMessage}>
              <input
                className="flex-1 border border-line bg-paper px-md py-sm text-body-sm"
                placeholder="Type a message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button
                type="submit"
                className="border border-accent bg-accent px-md py-sm font-bold uppercase text-paper disabled:opacity-60"
                disabled={sending || !draft.trim()}
              >
                {sending ? "..." : "Send"}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
