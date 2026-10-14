"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Logo } from "@/components/logo";

export function McEntryForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    const value = code.trim();
    if (!value) {
      setError("Enter your MC / Host code");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/mc/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
        const message = typeof body?.error === "string" ? body.error : "That code didn't work. Check with your organizer.";
        setError(message);
        return;
      }
      toast("You're in. Welcome to the floor.", "success");
      router.replace("/mc/portal");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-md py-section text-center">
      <Logo width={160} height={40} className="block h-10 w-auto" />
      <p className="mt-lg text-body-xs font-bold uppercase tracking-[0.2em] text-accent">MC / Host access</p>
      <h1 className="mt-2 font-display text-display-lg uppercase">Run the show</h1>
      <p className="mt-2 text-body-sm text-ink-muted">
        Enter the code your organizer shared to open the live battle controls — no login needed.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-lg w-full">
        <Label htmlFor="mc-code">Access code</Label>
        <Input
          id="mc-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          className="text-center font-mono uppercase tracking-[0.2em]"
        />
        {error ? <FieldError>{error}</FieldError> : null}
        <Button type="submit" loading={busy} className="mt-md w-full" size="lg">
          Enter portal
        </Button>
      </form>
    </main>
  );
}
