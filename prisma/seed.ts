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

// ---- Organizer ----
const organizer = await prisma.user.upsert({
  where: { email: "organizer@callout.local" },
  update: { name: "Cypher Org", role: UserRole.ORGANIZER, passwordHash, upiId: "cypherorg@upi" },
  create: { email: "organizer@callout.local", name: "Cypher Org", role: UserRole.ORGANIZER, passwordHash, upiId: "cypherorg@upi" },
});

// ---- Delete old demo event (cascade wipes categories, rounds, matches, judge slots, prize pools, registrations) ----
try {
  await prisma.event.delete({ where: { slug: "summer-cypher-2026" } });
} catch {
  // event doesn't exist yet — that's fine
}

// ---- 30 mock artists ----
const artistDefs = [
  "Mike Chen", "Sarah Kim", "Dave Rodriguez", "Anna Liu", "James Park",
  "Lisa Tran", "Marcus Johnson", "Nina Patel", "Tyrone Williams", "Yuki Tanaka",
  "Diego Martinez", "Aaliyah Brown", "Kenji Sato", "Maria Garcia", "Chris Osei",
  "Maya Singh", "Trevor Hayes", "Luna Cruz", "Andre Dubois", "Priya Sharma",
  "Jamal Davis", "Sofia Rossi", "Kai Nakamura", "Zara Ahmed", "Felix Wong",
  "Imani Jones", "Hiro Yamamoto", "Eva Novak", "Malik Carter", "Rosa Lopez",
];

const artists = [];
for (let i = 0; i < artistDefs.length; i++) {
  const name = artistDefs[i];
  const email = `artist${i + 1}@callout.local`;
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role: UserRole.ARTIST, passwordHash },
    create: { email, name, role: UserRole.ARTIST, passwordHash },
  });
  artists.push(user);
}

// Keep the legacy judge login account for back-compat
await prisma.user.upsert({
  where: { email: "judge@callout.local" },
  update: { name: "Legacy Judge", role: UserRole.JUDGE, passwordHash },
  create: { email: "judge@callout.local", name: "Legacy Judge", role: UserRole.JUDGE, passwordHash },
});

// ---- Event ----
const now = new Date();
const startsAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);

const event = await prisma.event.create({
  data: {
    title: "Summer Cypher 2026",
    slug: "summer-cypher-2026",
    venue: "The Underground",
    city: "Brooklyn",
    status: "LIVE",
    startsAt,
    organizerId: organizer.id,
  },
});

// ---- Categories ----
const breaking = await prisma.category.create({ data: { eventId: event.id, name: "Breaking", maxCompetitors: 32, entryFee: 500, entryCurrency: "INR" } });
const popping = await prisma.category.create({ data: { eventId: event.id, name: "Popping", maxCompetitors: 32, entryFee: 500, entryCurrency: "INR" } });
const hiphop = await prisma.category.create({ data: { eventId: event.id, name: "Hip-Hop", maxCompetitors: 16, entryFee: 500, entryCurrency: "INR" } });

// ---- Round phases ----
const phaseDefs: Record<string, Array<{ order: number; type: RoundType; label: string; roundCount: number; roundDuration: number; advanceCount?: number }>> = {
  breaking: [
    { order: 1, type: RoundType.CYPHER, label: "Cypher Round", roundCount: 1, roundDuration: 60, advanceCount: 8 },
    { order: 2, type: RoundType.BATTLE_1V1, label: "Top 8", roundCount: 2, roundDuration: 30 },
    { order: 3, type: RoundType.FINAL, label: "Finals", roundCount: 3, roundDuration: 45 },
  ],
  popping: [
    { order: 1, type: RoundType.CYPHER, label: "Cypher Round", roundCount: 1, roundDuration: 60, advanceCount: 8 },
    { order: 2, type: RoundType.BATTLE_1V1, label: "Top 8", roundCount: 2, roundDuration: 30 },
    { order: 3, type: RoundType.FINAL, label: "Finals", roundCount: 3, roundDuration: 45 },
  ],
  hiphop: [
    { order: 1, type: RoundType.QUALIFIER, label: "Qualifiers", roundCount: 1, roundDuration: 45, advanceCount: 8 },
    { order: 2, type: RoundType.BATTLE_1V1, label: "Top 8", roundCount: 2, roundDuration: 30 },
    { order: 3, type: RoundType.FINAL, label: "Finals", roundCount: 3, roundDuration: 45 },
  ],
};

for (const [catName, phases] of Object.entries(phaseDefs)) {
  const cat = catName === "breaking" ? breaking : catName === "popping" ? popping : hiphop;
  for (const phase of phases) {
    await prisma.roundFormat.create({
      data: {
        categoryId: cat.id,
        order: phase.order,
        type: phase.type,
        label: phase.label,
        roundCount: phase.roundCount,
        roundDuration: phase.roundDuration,
        advanceCount: phase.advanceCount ?? null,
        phaseStatus: phase.order === 1 ? "ACTIVE" : "PENDING",
      },
    });
  }
  await prisma.category.update({ where: { id: cat.id }, data: { currentPhaseOrder: 1 } });
}

// ---- Judge slots (9 total: 3 per category) ----
const judgeSlotDefs = [
  { code: "BRK001", name: "Head Judge", categoryId: breaking.id },
  { code: "BRK002", name: "Score Judge", categoryId: breaking.id },
  { code: "BRK003", name: "Tech Judge", categoryId: breaking.id },
  { code: "POP001", name: "Head Judge", categoryId: popping.id },
  { code: "POP002", name: "Score Judge", categoryId: popping.id },
  { code: "POP003", name: "Tech Judge", categoryId: popping.id },
  { code: "HIP001", name: "Head Judge", categoryId: hiphop.id },
  { code: "HIP002", name: "Score Judge", categoryId: hiphop.id },
  { code: "HIP003", name: "Tech Judge", categoryId: hiphop.id },
];

for (const slot of judgeSlotDefs) {
  await prisma.judgeSlot.create({
    data: { code: slot.code, name: slot.name, eventId: event.id, categoryId: slot.categoryId, isActive: true },
  });
}

// ---- Registrations: 12 Breaking, 10 Popping, 8 Hip-Hop = 30 total ----
const crews = ["Soul Mechanics", "Floor Assassins", "Rhythm Killers", "Flow State", "Concrete Kings", null];
const cities = ["Brooklyn", "Queens", "Bronx", "Jersey City", "Newark"];
const experiences = ["PRO", "ADVANCED", "INTERMEDIATE"];
const referrals = ["Instagram", "TikTok", "Friend", "Crew", "Event Website"];

const regPlan: Array<{ category: typeof breaking; count: number; offset: number }> = [
  { category: breaking, count: 12, offset: 0 },
  { category: popping, count: 10, offset: 12 },
  { category: hiphop, count: 8, offset: 22 },
];

let seedNum = 1;
for (const plan of regPlan) {
  for (let i = 0; i < plan.count; i++) {
    const artist = artists[plan.offset + i];
    await prisma.registration.create({
      data: {
        userId: artist.id,
        categoryId: plan.category.id,
        status: "CONFIRMED",
        entryFee: plan.category.entryFee,
        entryCurrency: plan.category.entryCurrency,
        paid: true,
        paidAt: now,
        seed: seedNum,
        style: plan.category.name,
        crew: crews[i % crews.length] ?? null,
        city: cities[i % cities.length],
        country: "US",
        experience: experiences[i % experiences.length],
        socialHandle: `@${artist.name?.toLowerCase().replace(/\s+/g, "")}`,
        referral: referrals[i % referrals.length],
      },
    });
    seedNum++;
  }
  seedNum = 1;
}

// ---- Prize pools ----
const distribution = [
  { rank: 1, label: "Winner", pct: 60 },
  { rank: 2, label: "Runner-up", pct: 25 },
  { rank: 3, label: "Semi-finalist", pct: 15 },
];

await prisma.prizePool.create({ data: { categoryId: breaking.id, totalAmount: 250000, currency: "USD", distribution } });
await prisma.prizePool.create({ data: { categoryId: popping.id, totalAmount: 150000, currency: "USD", distribution } });
await prisma.prizePool.create({ data: { categoryId: hiphop.id, totalAmount: 100000, currency: "USD", distribution } });

// ---- Feedback templates ----
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
  const existing = await prisma.feedbackTemplate.findFirst({ where: { text: tpl.text, organizerId: organizer.id } });
  if (!existing) {
    await prisma.feedbackTemplate.create({
      data: { organizerId: organizer.id, text: tpl.text, minScore: tpl.minScore, maxScore: tpl.maxScore, scoreLabel: tpl.scoreLabel },
    });
  }
}

console.log("Seed complete: 1 organizer, 30 artists, 1 event, 3 categories, 9 judge slots, 30 registrations, 3 prize pools, 10 feedback templates");

await prisma.$disconnect();