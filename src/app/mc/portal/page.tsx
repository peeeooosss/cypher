import { redirect } from "next/navigation";
import { McPortal } from "@/components/mc-portal";
import { getStaffSession } from "@/lib/staff-codes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "MC / Host Portal | CYPHR",
  description: "Live battle controls for MCs and Hosts.",
};

export default async function McPortalPage() {
  const session = await getStaffSession();
  if (!session) redirect("/mc");

  return <McPortal />;
}
