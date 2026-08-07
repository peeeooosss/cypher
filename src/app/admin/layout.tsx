import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/organizers", label: "Organizations" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <div className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">CYPHR admin</p>
          <h1 className="font-display text-display-lg uppercase">Control room</h1>
          <p className="mt-sm text-body-sm text-ink-muted">Signed in as {user.email}</p>
        </div>
        <SignOutButton />
      </div>

      <nav className="mt-section border-b border-line">
        <div className="flex flex-wrap gap-xs">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="border border-b-0 border-line px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-ink-muted hover:text-accent"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="mt-section">{children}</div>
    </main>
  );
}
