"use client";

import { useEffect, useState } from "react";
import { GIG_CONNECTION_FEE, formatInr } from "@/lib/pricing";
import { PayuCheckout } from "@/components/payu-checkout";

type ConversationSummary = {
  id: string;
  gigTitle: string | null;
  otherParty: string;
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unlocked: boolean;
  agreementId: string | null;
  unreadCount: number;
};

type Thread = {
  id: string;
  gigTitle: string | null;
  organizerName: string;
  artistName: string;
  myId: string;
  messages: { id: string; senderId: string; body: string; createdAt: string }[];
  locked: boolean;
  agreement: {
    id: string;
    status: string;
    connectionPaymentStatus: string;
    connectionPaymentMethod: string | null;
    connectionPaymentSentAt: string | null;
    connectionPaidAt: string | null;
  } | null;
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
    setActiveId(id);
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) setThread(await res.json());
    else setThread(null);
  }

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    async function pollThread() {
      const res = await fetch(`/api/conversations/${activeId}`);
      if (cancelled) return;
      if (res.ok) {
        const t: Thread = await res.json();
        setThread((prev) => {
          if (!prev) return t;
          if (t.locked) return t;
          return { ...t, messages: dedupeMessages(prev.messages, t.messages) };
        });
      }
    }
    void pollThread();
    const interval = setInterval(() => void pollThread(), 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeId]);

  function dedupeMessages(prev: Thread["messages"], next: Thread["messages"]) {
    const byId = new Map(prev.map((m) => [m.id, m]));
    for (const m of next) {
      if (!byId.has(m.id)) byId.set(m.id, m);
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
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
      await loadConversations();
      if (activeId) {
        const tRes = await fetch(`/api/conversations/${activeId}`);
        if (tRes.ok) {
          const t: Thread = await tRes.json();
          setThread(t);
        }
      }
    }
  }

  const activeConv = conversations.find((c) => c.id === activeId);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div className="grid gap-md lg:grid-cols-[16rem_1fr]">
      <div className="border border-line bg-paper-soft p-md">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Conversations</p>
          {totalUnread > 0 ? (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-xs font-mono text-[0.65rem] font-bold uppercase text-paper">
              {totalUnread}
            </span>
          ) : null}
        </div>
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
                  {c.unlocked && c.unreadCount > 0 ? (
                    <span className="mt-xs inline-block rounded-full bg-accent px-xs font-mono text-[0.6rem] font-bold uppercase text-paper">
                      {c.unreadCount} unread
                    </span>
                  ) : null}
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
        ) : activeConv && thread?.locked ? (
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
                {thread.agreement?.connectionPaymentStatus === "PENDING" ? (
                  <div className="border border-accent bg-paper p-md">
                    <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
                      PayU payment processing
                    </p>
                    <p className="mt-xs text-body-sm text-ink-muted">
                      Your chat unlocks automatically after PayU confirms the connection fee.
                    </p>
                  </div>
                ) : thread.agreement ? (
                  <div>
                    <PayuCheckout
                      type="GIG_CONNECTION"
                      referenceId={thread.agreement.id}
                      label={`Pay ${formatInr(GIG_CONNECTION_FEE)} with PayU`}
                    />
                  </div>
                ) : null}
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
                  {activeConv.otherParty} needs to pay the {formatInr(GIG_CONNECTION_FEE)} connection fee
                  before you can exchange messages. The chat unlocks automatically once verified.
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex h-full flex-col">
            <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
              {thread?.gigTitle ?? "Gig"} · with {thread?.myId === thread?.organizerName ? thread?.artistName : thread?.organizerName}
            </p>
            <div className="mt-md flex-1 space-y-sm overflow-y-auto">
              {thread?.messages.length === 0 ? (
                <p className="text-body-sm text-ink-muted">No messages yet. Say hello.</p>
              ) : (
                thread?.messages.map((m) => (
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
        )}
      </div>
    </div>
  );
}
