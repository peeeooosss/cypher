import { prisma } from "@/lib/prisma";

export type RegistrationRosterRow = {
  registrationId: string;
  categoryId: string;
  categoryName: string;
  role: "CAPTAIN" | "MEMBER";
  name: string | null;
  username: string | null;
  phone: string | null;
  email: string | null;
  teamName: string | null;
  choreographerName: string | null;
  address: string | null;
  age: number | null;
  auditionCity: string | null;
  musicFileName: string | null;
  musicFileUrl: string | null;
  memberStatus: string | null;
  paid: boolean;
  entryFee: number | null;
  entryCurrency: string | null;
  entryStatus: string;
  createdAt: string;
};

export async function getEventRegistrations(eventId: string) {
  return prisma.registration.findMany({
    where: { category: { eventId } },
    select: {
      id: true,
      userId: true,
      teamName: true,
      choreographerName: true,
      address: true,
      age: true,
      auditionCity: true,
      musicFileName: true,
      musicFileUrl: true,
      paid: true,
      entryFee: true,
      entryCurrency: true,
      status: true,
      createdAt: true,
      category: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, username: true, phone: true, email: true } },
      members: {
        select: {
          userId: true,
          role: true,
          status: true,
          user: { select: { id: true, name: true, username: true, phone: true, email: true } },
        },
        orderBy: { invitedAt: "asc" },
      },
    },
    orderBy: [{ category: { name: "asc" } }, { createdAt: "asc" }],
  });
}

type EventRegistration = Awaited<ReturnType<typeof getEventRegistrations>>[number];

export function toRosterRows(registrations: EventRegistration[]): RegistrationRosterRow[] {
  const rows: RegistrationRosterRow[] = [];

  for (const registration of registrations) {
    const shared = {
      registrationId: registration.id,
      categoryId: registration.category.id,
      categoryName: registration.category.name,
      teamName: registration.teamName,
      choreographerName: registration.choreographerName,
      address: registration.address,
      age: registration.age,
      auditionCity: registration.auditionCity,
      musicFileName: registration.musicFileName,
      musicFileUrl: registration.musicFileUrl,
      paid: registration.paid,
      entryFee: registration.entryFee,
      entryCurrency: registration.entryCurrency,
      entryStatus: registration.status,
      createdAt: registration.createdAt.toISOString(),
    };

    rows.push({
      ...shared,
      role: "CAPTAIN",
      name: registration.user.name,
      username: registration.user.username,
      phone: registration.user.phone,
      email: registration.user.email,
      memberStatus: "ACCEPTED",
    });

    for (const member of registration.members) {
      if (member.userId === registration.userId) continue;
      rows.push({
        ...shared,
        role: "MEMBER",
        name: member.user.name,
        username: member.user.username,
        phone: member.user.phone,
        email: member.user.email,
        memberStatus: member.status,
      });
    }
  }

  return rows;
}
