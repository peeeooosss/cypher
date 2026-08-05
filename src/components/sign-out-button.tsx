"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="border border-line px-md py-sm text-body-sm font-bold uppercase hover:border-accent"
      onClick={() => signOut({ callbackUrl: "/" })}
      type="button"
    >
      Sign out
    </button>
  );
}
