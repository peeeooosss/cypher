"use client";

import { FormEvent, useState } from "react";
import { responseError } from "@/lib/client-error";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword) {
      setError("Current password is required.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        setError(await responseError(res, "Failed to change password."));
        setIsSubmitting(false);
        return;
      }

      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setIsSubmitting(false);
    } catch {
      setError("Failed to change password.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-section border border-line bg-paper-soft p-lg">
      <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Change Password</p>
      <form className="mt-md grid gap-md sm:grid-cols-2" onSubmit={handleSubmit}>
        <label className="block text-body-sm font-bold uppercase sm:col-span-2">
          Current password
          <input
            required
            type="password"
            autoComplete="current-password"
            className="mt-xs block w-full border border-line bg-paper px-md py-sm text-body-md outline-none focus:border-accent"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label className="block text-body-sm font-bold uppercase">
          New password
          <input
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="mt-xs block w-full border border-line bg-paper px-md py-sm text-body-md outline-none focus:border-accent"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </label>
        <label className="block text-body-sm font-bold uppercase">
          Confirm new password
          <input
            required
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="mt-xs block w-full border border-line bg-paper px-md py-sm text-body-md outline-none focus:border-accent"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </label>
        {error ? <p className="text-body-sm text-accent sm:col-span-2">{error}</p> : null}
        {success ? <p className="text-body-sm text-accent sm:col-span-2">{success}</p> : null}
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
          >
            {isSubmitting ? "Updating..." : "Change Password"}
          </button>
        </div>
      </form>
    </section>
  );
}
