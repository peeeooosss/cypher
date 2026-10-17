import { UserRole, EventType, CategoryFormat, EventStatus, RegistrationStatus, RegistrationMemberRole, RegistrationMemberStatus, RoundType } from "./../src/generated/prisma/client.js";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./../src/generated/prisma/client.js";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}
const prisma = new PrismaClient({ adapter: new PrismaPg(new Pool({ connectionString })) });

async function main() {
  const password = "password123";
  const passwordHash = await bcrypt.hash(password, 12);

  console.log("=== Setting up Mock Dance Competition ===");

  // Create organizer if doesn't exist
  let organizer = await prisma.user.findUnique({
    where: { email: "mock-org@joincyphr.in" },
  });

  if (!organizer) {
    organizer = await prisma.user.create({
      data: {
        email: "mock-org@joincyphr.in",
        passwordHash,
        role: UserRole.ORGANIZER,
        name: "Mock Dance Studio",
        studioName: "Mock Dance Studio",
        isProfilePublic: true,
      },
    });
    console.log("Created organizer:", organizer.email);
  } else {
    console.log("Organizer already exists:", organizer.email);
  }

  // Create mock event
  const slug = "mock-dance-competition-2026";
  let event = await prisma.event.findUnique({ where: { slug } });

  if (!event) {
    event = await prisma.event.create({
      data: {
        title: "Mock Dance Competition 2026",
        slug,
        description: "A mock dance competition for testing with Solo, Duo, Trio, and Group categories.",
        eventType: EventType.DANCE_COMPETITION,
        venue: "Test Venue",
        city: "Delhi",
        state: "Delhi",
        status: EventStatus.PUBLISHED,
        startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        lastRegistrationAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        organizerId: organizer.id,
        categoryCount: 4,
        flatFee: 199,
        flatFeePaid: true,
        flatFeePaidAt: new Date(),
        flatFeePaymentStatus: "VERIFIED",
        flatFeePaymentMethod: "UPI",
      },
    });
    console.log("Created event:", event.title);
  } else {
    console.log("Event already exists:", event.title);
  }

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { eventId_name: { eventId: event.id, name: "SOLO" } },
      update: {},
      create: {
        eventId: event.id,
        name: "SOLO",
        format: CategoryFormat.SOLO,
        minMembers: 1,
        maxMembers: 1,
        maxCompetitors: 20,
        entryFee: 500,
        entryCurrency: "INR",
      },
    }),
    prisma.category.upsert({
      where: { eventId_name: { eventId: event.id, name: "DUO" } },
      update: {},
      create: {
        eventId: event.id,
        name: "DUO",
        format: CategoryFormat.DUO,
        minMembers: 2,
        maxMembers: 2,
        maxCompetitors: 16,
        entryFee: 800,
        entryCurrency: "INR",
      },
    }),
    prisma.category.upsert({
      where: { eventId_name: { eventId: event.id, name: "TRIO" } },
      update: {},
      create: {
        eventId: event.id,
        name: "TRIO",
        format: CategoryFormat.TRIO,
        minMembers: 3,
        maxMembers: 3,
        maxCompetitors: 12,
        entryFee: 1200,
        entryCurrency: "INR",
      },
    }),
    prisma.category.upsert({
      where: { eventId_name: { eventId: event.id, name: "GROUP" } },
      update: {},
      create: {
        eventId: event.id,
        name: "GROUP",
        format: CategoryFormat.GROUP,
        minMembers: 4,
        maxMembers: 6,
        maxCompetitors: 10,
        entryFee: 1500,
        entryCurrency: "INR",
      },
    }),
  ]);

  console.log("Created/updated 4 categories");

  // Add rounds
  for (const cat of categories) {
    const existingRounds = await prisma.roundFormat.count({ where: { categoryId: cat.id } });
    if (existingRounds === 0) {
      await prisma.roundFormat.createMany({
        data: [
          {
            categoryId: cat.id,
            order: 1,
            type: RoundType.QUALIFIER,
            label: "Qualifiers",
            roundCount: 1,
            roundDuration: 120,
            advanceCount: 8,
            phaseStatus: "PENDING",
          },
          {
            categoryId: cat.id,
            order: 2,
            type: RoundType.FINAL,
            label: "Finals",
            roundCount: 2,
            roundDuration: 90,
            phaseStatus: "PENDING",
          },
        ],
      });
      console.log(`Added rounds for ${cat.name}`);
    }
  }

  // Add judge slots
  const slotCodes = ["MSL01", "MSL02", "MDU01", "MDU02", "MTR01", "MTR02", "MGR01", "MGR02"];
  const slotNames = ["Solo Judge 1", "Solo Judge 2", "Duo Judge 1", "Duo Judge 2", "Trio Judge 1", "Trio Judge 2", "Group Judge 1", "Group Judge 2"];
  const catIds = [categories[0].id, categories[0].id, categories[1].id, categories[1].id, categories[2].id, categories[2].id, categories[3].id, categories[3].id];
  
  for (let i = 0; i < slotCodes.length; i++) {
    const existing = await prisma.judgeSlot.findUnique({ where: { code: slotCodes[i] } });
    if (!existing) {
      await prisma.judgeSlot.create({
        data: {
          code: slotCodes[i],
          name: slotNames[i],
          eventId: event.id,
          categoryId: catIds[i],
          isActive: true,
        },
      });
    }
  }
  console.log("Added judge slots");

  // Create mock artists
  const artists: Array<{ id: string; name: string | null; style: string | null; city: string | null }> = [];
  for (let i = 1; i <= 10; i++) {
    const email = `mockartist${i.toString().padStart(2, "0")}@joincyphr.in`;
    let artist = await prisma.user.findUnique({ where: { email } });
    if (!artist) {
      artist = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: UserRole.ARTIST,
          name: `Mock Artist ${i}`,
          phone: `98765432${i.toString().padStart(2, "0")}`,
          city: "Delhi",
          style: "Hip-Hop",
          isProfilePublic: true,
        },
      });
      console.log(`Created artist: ${artist.email}`);
    }
    artists.push(artist);
  }

  // Create registrations
  const now = new Date();
  // Solo registrations (artists 0,1,2)
  for (let i = 0; i < 3; i++) {
    const artist = artists[i];
    const existing = await prisma.registration.findUnique({
      where: { userId_categoryId: { userId: artist.id, categoryId: categories[0].id } },
    });
    if (!existing) {
      await prisma.registration.create({
        data: {
          userId: artist.id,
          categoryId: categories[0].id,
          status: RegistrationStatus.CONFIRMED,
          format: CategoryFormat.SOLO,
          entryFee: categories[0].entryFee,
          entryCurrency: "INR",
          paid: true,
          paidAt: now,
          paidClaimedAt: now,
          teamName: artist.name,
          style: artist.style,
          city: artist.city,
          members: {
            create: [
              {
                categoryId: categories[0].id,
                userId: artist.id,
                role: RegistrationMemberRole.CAPTAIN,
                status: RegistrationMemberStatus.ACCEPTED,
                acceptedAt: now,
              },
            ],
          },
        },
      });
    }
  }

  // Duo registrations (artists 3,4 form duo; 5,6 form another)
  const duos = [[3, 4], [5, 6]];
  for (let d = 0; d < duos.length; d++) {
    const [a1, a2] = duos[d];
    const captain = artists[a1];
    const mate = artists[a2];
    const existing = await prisma.registration.findUnique({
      where: { userId_categoryId: { userId: captain.id, categoryId: categories[1].id } },
    });
    if (!existing) {
      await prisma.registration.create({
        data: {
          userId: captain.id,
          categoryId: categories[1].id,
          status: RegistrationStatus.CONFIRMED,
          format: CategoryFormat.DUO,
          entryFee: categories[1].entryFee,
          entryCurrency: "INR",
          paid: true,
          paidAt: now,
          paidClaimedAt: now,
          teamName: `${captain.name} & ${mate.name}`,
          style: captain.style,
          city: captain.city,
          members: {
            create: [
              {
                categoryId: categories[1].id,
                userId: captain.id,
                role: RegistrationMemberRole.CAPTAIN,
                status: RegistrationMemberStatus.ACCEPTED,
                acceptedAt: now,
              },
              {
                categoryId: categories[1].id,
                userId: mate.id,
                role: RegistrationMemberRole.MEMBER,
                status: RegistrationMemberStatus.ACCEPTED,
                acceptedAt: now,
              },
            ],
          },
        },
      });
    }
  }

  // Trio registration (artists 7,8,9)
  const trio = [7, 8, 9];
  const trioCaptain = artists[trio[0]];
  const existingTrio = await prisma.registration.findUnique({
    where: { userId_categoryId: { userId: trioCaptain.id, categoryId: categories[2].id } },
  });
  if (!existingTrio) {
    await prisma.registration.create({
      data: {
        userId: trioCaptain.id,
        categoryId: categories[2].id,
        status: RegistrationStatus.CONFIRMED,
        format: CategoryFormat.TRIO,
        entryFee: categories[2].entryFee,
        entryCurrency: "INR",
        paid: true,
        paidAt: now,
        paidClaimedAt: now,
        teamName: `${trioCaptain.name} Trio`,
        style: trioCaptain.style,
        city: trioCaptain.city,
        members: {
          create: trio.map((idx, pos) => ({
            categoryId: categories[2].id,
            userId: artists[idx].id,
            role: pos === 0 ? RegistrationMemberRole.CAPTAIN : RegistrationMemberRole.MEMBER,
            status: RegistrationMemberStatus.ACCEPTED,
            acceptedAt: now,
          })),
        },
      },
    });
  }

  // Group registration (artists 4,5,6,7 - overlapping for variety)
  const group = [4, 5, 6, 7];
  const groupCaptain = artists[group[0]];
  const existingGroup = await prisma.registration.findUnique({
    where: { userId_categoryId: { userId: groupCaptain.id, categoryId: categories[3].id } },
  });
  if (!existingGroup) {
    await prisma.registration.create({
      data: {
        userId: groupCaptain.id,
        categoryId: categories[3].id,
        status: RegistrationStatus.CONFIRMED,
        format: CategoryFormat.GROUP,
        entryFee: categories[3].entryFee,
        entryCurrency: "INR",
        paid: true,
        paidAt: now,
        paidClaimedAt: now,
        teamName: `${groupCaptain.name} Crew`,
        style: groupCaptain.style,
        city: groupCaptain.city,
        members: {
          create: group.map((idx, pos) => ({
            categoryId: categories[3].id,
            userId: artists[idx].id,
            role: pos === 0 ? RegistrationMemberRole.CAPTAIN : RegistrationMemberRole.MEMBER,
            status: RegistrationMemberStatus.ACCEPTED,
            acceptedAt: now,
          })),
        },
      },
    });
  }

  console.log("Created registrations across all categories");

  console.log("\n=== Setup Complete ===");
  console.log("Organizer:", organizer.email, "(password: password123)");
  console.log("Event:", event.slug, "-", event.title);
  console.log("Categories: SOLO, DUO, TRIO, GROUP");
  console.log("Mock Artists: 10 created (mockartist01-10@joincyphr.in, password: password123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
