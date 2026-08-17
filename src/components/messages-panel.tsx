"use client";

import { useEffect, useState } from "react";

type ConversationSummary = {
  id: string;
  gigTitle: string | null;
  otherParty: string;
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
};

type Thread = {
  id: string;
  gigTitle: string | null;
  organizerName: string;
  artistName: string;
  myId: string;
  messages: { id: string; senderId: string; body: string; createdAt: string }[];
};

export function MessagesPanel() {
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

  return (
    <div className="grid gap-md lg:grid-cols-[16rem_1fr]">
      <div className="border border-line bg-paper-soft p-md">
        <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Conversations</p>
        {!loaded ? (
          <p className="mt-sm text-body-sm text-ink-muted">Loading...</p>
        ) : conversations.length === 0 ? (
          <p className="mt-sm text-body-sm text-ink-muted">
            No conversations yet. They appear after an offer is accepted and the connection fee is paid.
          </p>
        ) : (
          <ul className="mt-sm space-y-xs">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`w-full border px-sm py-xs text-left text-body-sm ${activeId === c.id ? "border-accent bg-accent/10 text-accent" : "border-line hover:border-accent"}`}
                  onClick={() => void openConversation(c.id)}
                >
                  <span className="block font-bold uppercase">{c.otherParty}</span>
                  <span className="block truncate text-[0.7rem] text-ink-muted">
                    {c.gigTitle ?? "Gig"} — {c.lastMessage?.body ?? "No messages"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-line bg-paper-soft p-md">
        {!thread ? (
          <p className="text-body-sm text-ink-muted">Select a conversation to view messages.</p>
        ) : (
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
                    className={`max-w-[80%] border px-md py-sm text-body-sm ${m.senderId === thread.myId ? "ml-auto border-accent bg-accent/10" : "mr-auto border-line bg-paper"}`}
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
