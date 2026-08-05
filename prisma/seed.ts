import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole, RoundType } from "../src/generated/prisma/enums";

const password = process.env.SEED_PASSWORD ?? "password";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be configured");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const passwordHash = await hash(password, 12);

const organizer = await prisma.user.upsert({
  where: { email: "organizer@callout.local" },
  update: { name: "Cypher Org", role: UserRole.ORGANIZER, passwordHash },
  create: { email: "organizer@callout.local", name: "Cypher Org", role: UserRole.ORGANIZER, passwordHash },
});

const artistEmails = [
  "artist1@callout.local",
  "artist2@callout.local",
  "artist3@callout.local",
  "artist4@callout.local",
  "artist5@callout.local",
];

const artistNames = [
  "Mike Chen",
  "Sarah Kim",
  "Dave Rodriguez",
  "Anna Liu",
  "James Park",
];

const artists = [];
for (let i = 0; i < artistEmails.length; i++) {
  const user = await prisma.user.upsert({
    where: { email: artistEmails[i] },
    update: { name: artistNames[i], role: UserRole.ARTIST, passwordHash },
    create: { email: artistEmails[i], name: artistNames[i], role: UserRole.ARTIST, passwordHash },
  });
  artists.push(user);
}

await prisma.user.upsert({
  where: { email: "judge@callout.local" },
  update: { name: "CallOut Judge", role: UserRole.JUDGE, passwordHash },
  create: { email: "judge@callout.local", name: "CallOut Judge", role: UserRole.JUDGE, passwordHash },
});

const now = new Date();
const startsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

const event = await prisma.event.upsert({
  where: { slug: "summer-cypher-2026" },
  update: { title: "Summer Cypher 2026", venue: "The Underground", city: "Brooklyn", status: "PUBLISHED", startsAt },
  create: {
    title: "Summer Cypher 2026",
    slug: "summer-cypher-2026",
    venue: "The Underground",
    city: "Brooklyn",
    status: "PUBLISHED",
    startsAt,
    organizerId: organizer.id,
  },
});

const categoryDefs = [
  { name: "Breaking", maxCompetitors: 32 },
  { name: "Popping", maxCompetitors: 32 },
  { name: "Hip-Hop", maxCompetitors: 16 },
];

const categories = [];
for (const def of categoryDefs) {
  const category = await prisma.category.upsert({
    where: { eventId_name: { eventId: event.id, name: def.name } },
    update: { maxCompetitors: def.maxCompetitors },
    create: { eventId: event.id, name: def.name, maxCompetitors: def.maxCompetitors },
  });
  categories.push(category);
}

const breaking = categories[0];
const popping = categories[1];
const hiphop = categories[2];

const breakingPhases = [
  { order: 1, type: RoundType.CYPHER, label: "Cypher Round", roundCount: 1, roundDuration: 60, advanceCount: 8 },
  { order: 2, type: RoundType.BATTLE_1V1, label: "Top 8", roundCount: 2, roundDuration: 30, advanceCount: undefined },
  { order: 3, type: RoundType.FINAL, label: "Finals", roundCount: 3, roundDuration: 45, advanceCount: undefined },
];

const poppingPhases = [
  { order: 1, type: RoundType.CYPHER, label: "Cypher Round", roundCount: 1, roundDuration: 60, advanceCount: 8 },
  { order: 2, type: RoundType.BATTLE_1V1, label: "Top 8", roundCount: 2, roundDuration: 30, advanceCount: undefined },
  { order: 3, type: RoundType.FINAL, label: "Finals", roundCount: 3, roundDuration: 45, advanceCount: undefined },
];

const hiphopPhases = [
  { order: 1, type: RoundType.QUALIFIER, label: "Qualifiers", roundCount: 1, roundDuration: 45, advanceCount: 8 },
  { order: 2, type: RoundType.BATTLE_1V1, label: "Top 8", roundCount: 2, roundDuration: 30, advanceCount: undefined },
  { order: 3, type: RoundType.FINAL, label: "Finals", roundCount: 3, roundDuration: 45, advanceCount: undefined },
];

for (const phase of breakingPhases) {
  await prisma.roundFormat.upsert({
    where: { categoryId_order: { categoryId: breaking.id, order: phase.order } },
    update: { type: phase.type, label: phase.label, roundCount: phase.roundCount, roundDuration: phase.roundDuration, advanceCount: phase.advanceCount },
    create: { categoryId: breaking.id, order: phase.order, type: phase.type, label: phase.label, roundCount: phase.roundCount, roundDuration: phase.roundDuration, advanceCount: phase.advanceCount },
  });
}

for (const phase of poppingPhases) {
  await prisma.roundFormat.upsert({
    where: { categoryId_order: { categoryId: popping.id, order: phase.order } },
    update: { type: phase.type, label: phase.label, roundCount: phase.roundCount, roundDuration: phase.roundDuration, advanceCount: phase.advanceCount },
    create: { categoryId: popping.id, order: phase.order, type: phase.type, label: phase.label, roundCount: phase.roundCount, roundDuration: phase.roundDuration, advanceCount: phase.advanceCount },
  });
}

for (const phase of hiphopPhases) {
  await prisma.roundFormat.upsert({
    where: { categoryId_order: { categoryId: hiphop.id, order: phase.order } },
    update: { type: phase.type, label: phase.label, roundCount: phase.roundCount, roundDuration: phase.roundDuration, advanceCount: phase.advanceCount },
    create: { categoryId: hiphop.id, order: phase.order, type: phase.type, label: phase.label, roundCount: phase.roundCount, roundDuration: phase.roundDuration, advanceCount: phase.advanceCount },
  });
}

const judgeSlotDefs = [
  { code: "BRK001", name: "Head Judge", category: breaking },
  { code: "BRK002", name: "Score Judge", category: breaking },
  { code: "BRK003", name: "Tech Judge", category: breaking },
  { code: "POP001", name: "Head Judge", category: popping },
  { code: "POP002", name: "Score Judge", category: popping },
  { code: "POP003", name: "Tech Judge", category: popping },
  { code: "HIP001", name: "Head Judge", category: hiphop },
  { code: "HIP002", name: "Score Judge", category: hiphop },
  { code: "HIP003", name: "Tech Judge", category: hiphop },
];

for (const slot of judgeSlotDefs) {
  await prisma.judgeSlot.upsert({
    where: { code: slot.code },
    update: { name: slot.name, isActive: true, eventId: event.id, categoryId: slot.category.id },
    create: { code: slot.code, name: slot.name, isActive: true, eventId: event.id, categoryId: slot.category.id },
  });
}

const crews = ["Soul Mechanics", "Floor Assassins", "Rhythm Killers", "Flow State"];
const cities = ["Brooklyn", "Queens", "Bronx"];
const experienceLevels = ["PRO", "ADVANCED", "INTERMEDIATE"];

let seedCounter = 1;
for (const category of categories) {
  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];
    const existing = await prisma.registration.findUnique({
      where: { userId_categoryId: { userId: artist.id, categoryId: category.id } },
    });
    if (existing) {
      await prisma.registration.update({
        where: { id: existing.id },
        data: {
          status: "CONFIRMED",
          seed: seedCounter,
          style: category.name,
          crew: crews[i % crews.length],
          city: cities[i % cities.length],
          experience: experienceLevels[i % experienceLevels.length],
          socialHandle: `@${artist.name?.toLowerCase().replace(/\s+/g, "")}`,
          referral: "Instagram",
        },
      });
    } else {
      await prisma.registration.create({
        data: {
          userId: artist.id,
          categoryId: category.id,
          status: "CONFIRMED",
          seed: seedCounter,
          style: category.name,
          crew: crews[i % crews.length],
          city: cities[i % cities.length],
          experience: experienceLevels[i % experienceLevels.length],
          socialHandle: `@${artist.name?.toLowerCase().replace(/\s+/g, "")}`,
          referral: "Instagram",
        },
      });
    }
    seedCounter++;
  }
  seedCounter = 1;
}

const prizePoolDistribution = [
  { rank: 1, label: "Winner", pct: 60 },
  { rank: 2, label: "Runner-up", pct: 25 },
  { rank: 3, label: "Semi-finalist", pct: 15 },
];

await prisma.prizePool.upsert({
  where: { categoryId: breaking.id },
  update: { totalAmount: 2500, distribution: prizePoolDistribution },
  create: { categoryId: breaking.id, totalAmount: 2500, distribution: prizePoolDistribution },
});

await prisma.prizePool.upsert({
  where: { categoryId: popping.id },
  update: { totalAmount: 1500, distribution: prizePoolDistribution },
  create: { categoryId: popping.id, totalAmount: 1500, distribution: prizePoolDistribution },
});

await prisma.prizePool.upsert({
  where: { categoryId: hiphop.id },
  update: { totalAmount: 1000, distribution: prizePoolDistribution },
  create: { categoryId: hiphop.id, totalAmount: 1000, distribution: prizePoolDistribution },
});

const feedbackTemplates = [
  { text: "Excellent musicality and timing", minScore: 8, maxScore: 10, scoreLabel: "High" },
  { text: "Clean, precise footwork", minScore: 8, maxScore: 10, scoreLabel: "High" },
  { text: "Incredible creativity and originality", minScore: 8, maxScore: 10, scoreLabel: "High" },
  { text: "Strong stage presence and energy", minScore: 6, maxScore: 9, scoreLabel: "Mid" },
  { text: "Good foundation work", minScore: 6, maxScore: 9, scoreLabel: "Mid" },
  { text: "Solid effort, keep polishing", minScore: 4, maxScore: 7, scoreLabel: "Low" },
  { text: "Needs more dynamics and variation", minScore: 0, maxScore: 5, scoreLabel: "Low" },
  { text: "Watch your musicality", minScore: 0, maxScore: 5, scoreLabel: "Low" },
  { text: "Great battle attitude", minScore: 6, maxScore: 10, scoreLabel: "Mid" },
  { text: "Room for improvement on transitions", minScore: 0, maxScore: 6, scoreLabel: "Low" },
];

for (const tpl of feedbackTemplates) {
  const existing = await prisma.feedbackTemplate.findFirst({
    where: { text: tpl.text, organizerId: organizer.id },
  });
  if (!existing) {
    await prisma.feedbackTemplate.create({
      data: {
        organizerId: organizer.id,
        text: tpl.text,
        minScore: tpl.minScore,
        maxScore: tpl.maxScore,
        scoreLabel: tpl.scoreLabel,
      },
    });
  }
}

await prisma.$disconnect();
