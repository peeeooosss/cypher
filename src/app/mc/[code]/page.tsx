import { redirect } from "next/navigation";
import { McEntryForm } from "@/components/mc-entry-form";
import { getStaffSession } from "@/lib/staff-codes";

type PageProps = { params: Promise<{ code: string }> };

/** Shared code links (/mc/XXXX-XXXX-XXXX) land here and establish a session. */
export default async function McCodePage({ params }: PageProps) {
  const { code } = await params;
  const session = await getStaffSession();
  if (session) redirect("/mc/portal");

  const pretty = decodeURIComponent(code).replace(/[^a-z0-9-]/gi, "").toUpperCase();
  return <McEntryForm initialCode={pretty} />;
}
