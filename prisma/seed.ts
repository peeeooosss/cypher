import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole, RoundType, Skill, EventType } from "../src/generated/prisma/enums";

const password = process.env.SEED_PASSWORD ?? "password";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be configured");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const passwordHash = await hash(password, 12);

// ---- Admin ----
await prisma.user.upsert({
  where: { email: "admin@callout.local" },
  update: { name: "CYPHR Admin", role: UserRole.ADMIN, passwordHash },
  create: { email: "admin@callout.local", name: "CYPHR Admin", role: UserRole.ADMIN, passwordHash },
});

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
try {
  await prisma.event.delete({ where: { slug: "house-groove-workshop-2026" } });
} catch {
  // event doesn't exist yet — that's fine
}
try {
  await prisma.event.delete({ where: { slug: "national-dance-championship-2026" } });
} catch {
  // event doesn't exist yet — that's fine
}

// ---- Clear marketplace + achievements so the seed is repeatable ----
await prisma.gigApplication.deleteMany({});
await prisma.gig.deleteMany({});
await prisma.artistAchievement.deleteMany({});

// ---- 30 mock artists ----
const artistDefs = [
  "Mike Chen", "Sarah Kim", "Dave Rodriguez", "Anna Liu", "James Park",
  "Lisa Tran", "Marcus Johnson", "Nina Patel", "Tyrone Williams", "Yuki Tanaka",
  "Diego Martinez", "Aaliyah Brown", "Kenji Sato", "Maria Garcia", "Chris Osei",
  "Maya Singh", "Trevor Hayes", "Luna Cruz", "Andre Dubois", "Priya Sharma",
  "Jamal Davis", "Sofia Rossi", "Kai Nakamura", "Zara Ahmed", "Felix Wong",
  "Imani Jones", "Hiro Yamamoto", "Eva Novak", "Malik Carter", "Rosa Lopez",
];

const styles = ["Breaking", "Popping", "Hip-Hop", "Locking", "House"];
const crews = ["Soul Mechanics", "Floor Assassins", "Rhythm Killers", "Flow State", "Concrete Kings", null];
const cities = ["Guwahati", "Shillong", "Imphal", "Dibrugarh", "Silchar"];
const experiences = ["PRO", "ADVANCED", "INTERMEDIATE"];
const socialHandles = ["@mikekicks", "@sarahpops", "@davetops", "@annafreeze", "@jamesbreaks", "@lisamoves", "@marcusthunder", "@ninaspins", "@tyronefresh", "@yukirocks"];
const referrals = ["Instagram", "TikTok", "Friend", "Crew", "Event Website"];

const skillSets: Skill[][] = [
  ["DANCER", "CHOREOGRAPHER"],
  ["DANCER", "DJ"],
  ["DANCER", "MC"],
  ["DANCER", "GUITARIST"],
  ["DANCER", "DRUMMER"],
  ["DANCER", "VOCALIST"],
  ["DANCER", "RAPPER"],
  ["DANCER", "PRODUCER"],
  ["DANCER", "BEATBOXER"],
  ["DANCER", "PHOTOGRAPHER"],
  ["DANCER"],
  ["DANCER", "CHOREOGRAPHER", "PERFORMER"],
  ["DANCER", "DJ", "PERFORMER"],
  ["DANCER", "MC"],
  ["DANCER", "GUITARIST", "VOCALIST"],
  ["DANCER", "DRUMMER"],
  ["DANCER", "VOCALIST"],
  ["DANCER", "RAPPER"],
  ["DANCER", "PRODUCER", "DJ"],
  ["DANCER", "BEATBOXER"],
  ["DANCER", "CHOREOGRAPHER"],
  ["DANCER", "DJ"],
  ["DANCER", "MC", "PERFORMER"],
  ["DANCER", "GUITARIST"],
  ["DANCER", "DRUMMER", "PERFORMER"],
  ["DANCER", "VOCALIST"],
  ["DANCER", "RAPPER"],
  ["DANCER", "PRODUCER"],
  ["DANCER", "BEATBOXER"],
  ["DANCER", "PHOTOGRAPHER", "PERFORMER"],
];

const artists = [];
for (let i = 0; i < artistDefs.length; i++) {
  const name = artistDefs[i];
  const email = `artist${i + 1}@callout.local`;
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      username: `artist${i + 1}`,
      role: UserRole.ARTIST,
      passwordHash,
      style: styles[i % styles.length],
      crew: crews[i % crews.length],
      city: cities[i % cities.length],
      country: "India",
      experience: experiences[i % experiences.length],
      socialHandle: socialHandles[i % socialHandles.length],
      referral: referrals[i % referrals.length],
      skills: skillSets[i % skillSets.length],
    },
    create: {
      email,
      name,
      username: `artist${i + 1}`,
      role: UserRole.ARTIST,
      passwordHash,
      style: styles[i % styles.length],
      crew: crews[i % crews.length],
      city: cities[i % cities.length],
      country: "India",
      experience: experiences[i % experiences.length],
      socialHandle: socialHandles[i % socialHandles.length],
      referral: referrals[i % referrals.length],
      skills: skillSets[i % skillSets.length],
    },
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
    description:
      "The biggest underground breaking showcase of the season. Three floors, one stage, no rules but respect. Cash prizes for Breaking, Popping and Hip-Hop, live judges, and an all-night cypher after the battles.",
    eventType: "UNDERGROUND_BATTLE",
    venue: "The Underground",
    city: "Brooklyn",
    status: "PUBLISHED",
    startsAt,
    organizerId: organizer.id,
    categoryCount: 3,
    flatFee: 99,
    flatFeePaid: true,
    flatFeePaidAt: now,
    flatFeePaymentStatus: "VERIFIED",
    flatFeePaymentMethod: "UPI",
    flatFeePaymentSentAt: now,
  },
});

// ---- Categories ----
const breaking = await prisma.category.create({ data: { eventId: event.id, name: "Breaking", format: "BATTLE_1V1", minMembers: 1, maxMembers: 1, maxCompetitors: 32, entryFee: 500, entryCurrency: "INR" } });
const popping = await prisma.category.create({ data: { eventId: event.id, name: "Popping", format: "BATTLE_1V1", minMembers: 1, maxMembers: 1, maxCompetitors: 32, entryFee: 500, entryCurrency: "INR" } });
const hiphop = await prisma.category.create({ data: { eventId: event.id, name: "Hip-Hop", format: "BATTLE_1V1", minMembers: 1, maxMembers: 1, maxCompetitors: 16, entryFee: 500, entryCurrency: "INR" } });

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
        country: "India",
        experience: experiences[i % experiences.length],
        socialHandle: `@${artist.name?.toLowerCase().replace(/\s+/g, "")}`,
        referral: referrals[i % referrals.length],
        members: {
          create: [{ categoryId: plan.category.id, userId: artist.id, role: "CAPTAIN", status: "ACCEPTED", acceptedAt: now }],
        },
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

// ---- Gigs (freelance marketplace work posted by the organizer) ----
const future = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

const gigDefs: Array<{
  title: string;
  description: string;
  skillsRequired: Skill[];
  location: string;
  budget: number;
  startsAt: Date;
  status: "OPEN" | "FILLED";
}> = [
  {
    title: "DJ for Saturday cypher night",
    description:
      "Need a DJ comfortable with open-format battles — quick cuts, scratch-friendly, can read a crowd in a 2x2 floor setup. 4-hour set at The Underground.",
    skillsRequired: ["DJ", "DANCER"],
    location: "The Underground, Brooklyn",
    budget: 8000,
    startsAt: future(7),
    status: "OPEN",
  },
  {
    title: "Choreographer for music video",
    description:
      "Looking for a choreographer to build and rehearse a 90-second routine for an upcoming single. 3 shoot days, travel covered.",
    skillsRequired: ["CHOREOGRAPHER", "DANCER"],
    location: "Guwahati",
    budget: 25000,
    startsAt: future(14),
    status: "OPEN",
  },
  {
    title: "MC / host for open-mic cypher",
    description:
      "Host our monthly open-mic cypher — warm up the room, hype the battles, keep energy between rounds. Two-hour show.",
    skillsRequired: ["MC"],
    location: "Shillong",
    budget: 6000,
    startsAt: future(21),
    status: "OPEN",
  },
  {
    title: "Guitarist for live set",
    description:
      "One-off live set with a hip-hop producer — need a guitarist who can improvise over beats and keep up with tempo changes.",
    skillsRequired: ["GUITARIST", "VOCALIST"],
    location: "Imphal",
    budget: 12000,
    startsAt: future(10),
    status: "OPEN",
  },
  {
    title: "Dancer for festival performance",
    description:
      "Festival stage performance in front of ~2000 people. Need 4 dancers for a 6-minute routine. Rehearsals paid.",
    skillsRequired: ["DANCER", "PERFORMER"],
    location: "Dibrugarh",
    budget: 15000,
    startsAt: future(30),
    status: "OPEN",
  },
  {
    title: "B-boy workshop instructor",
    description:
      "Run a 2-day breaking fundamentals workshop for 40 kids. Session plan provided, bring your own style. Pay per day.",
    skillsRequired: ["DANCER", "CHOREOGRAPHER"],
    location: "Silchar",
    budget: 10000,
    startsAt: future(45),
    status: "FILLED",
  },
];

const gigs = [];
for (const def of gigDefs) {
  const gig = await prisma.gig.create({
    data: {
      organizerId: organizer.id,
      title: def.title,
      description: def.description,
      skillsRequired: def.skillsRequired,
      location: def.location,
      budget: def.budget,
      currency: "INR",
      startsAt: def.startsAt,
      status: def.status,
      feePaid: true,
      feePaidAt: now,
    },
  });
  gigs.push(gig);
}

// ---- Artist achievements (battle resume) ----
const achievementDefs: Array<{ artistIndex: number; title: string; competition: string; placement: string; year: number; prize: number; note?: string }> = [
  { artistIndex: 0, title: "Champion", competition: "North East Breaking Championship", placement: "1st", year: 2025, prize: 50000 },
  { artistIndex: 3, title: "Runner-up", competition: "Guwahati Cypher League", placement: "2nd", year: 2024, prize: 15000 },
  { artistIndex: 6, title: "Semi-finalist", competition: "National B-Boy Showcase", placement: "Semi-final", year: 2024, prize: 5000 },
  { artistIndex: 9, title: "Winner", competition: "Silchar Pop Off", placement: "1st", year: 2023, prize: 20000 },
  { artistIndex: 12, title: "Champion", competition: "House Groove Circuit", placement: "1st", year: 2025, prize: 30000 },
  { artistIndex: 15, title: "Runner-up", competition: "Imphal Street Clash", placement: "2nd", year: 2022, prize: 10000 },
  { artistIndex: 18, title: "Champion", competition: "Dibrugarh Break Finals", placement: "1st", year: 2024, prize: 40000 },
  { artistIndex: 21, title: "Top 4", competition: "Shillong Cypher Slam", placement: "Semi-final", year: 2025, prize: 8000 },
];

for (const def of achievementDefs) {
  await prisma.artistAchievement.create({
    data: {
      userId: artists[def.artistIndex].id,
      title: def.title,
      competition: def.competition,
      placement: def.placement,
      year: def.year,
      prize: def.prize,
      currency: "INR",
      note: def.note,
    },
  });
}

// ---- Gig applications ----
const applicationDefs: Array<{ artistIndex: number; gigIndex: number; message: string; status: "PENDING" | "ACCEPTED" }> = [
  {
    artistIndex: 1,
    gigIndex: 0,
    message: "I spin open-format battles weekly and can scratch between rounds. 4-hour set is no problem.",
    status: "ACCEPTED",
  },
  {
    artistIndex: 12,
    gigIndex: 1,
    message: "I've choreographed 3 music videos this year and work well under tight shoot schedules.",
    status: "PENDING",
  },
  {
    artistIndex: 21,
    gigIndex: 5,
    message: "Been teaching breaking fundamentals to kids for 2 years. Happy to follow your session plan.",
    status: "PENDING",
  },
];

for (const def of applicationDefs) {
  await prisma.gigApplication.create({
    data: {
      gigId: gigs[def.gigIndex].id,
      artistId: artists[def.artistIndex].id,
      message: def.message,
      status: def.status,
    },
  });
}

// ---- Workshop event (organizer gives workshops, artists join sessions) ----
const workshop = await prisma.event.create({
  data: {
    title: "House Groove Workshop",
    slug: "house-groove-workshop-2026",
    description:
      "A full-day house dance workshop for all levels. Learn the foundations of house — jacking, footwork, hustle — then open the floor for a guided cypher session.",
    eventType: EventType.WORKSHOP,
    venue: "Flow State Studio",
    city: "Mumbai",
    state: "Maharashtra",
    status: "PUBLISHED",
    startsAt: future(12),
    organizerId: organizer.id,
    categoryCount: 3,
    flatFee: 99,
    flatFeePaid: true,
    flatFeePaidAt: now,
    flatFeePaymentStatus: "VERIFIED",
    flatFeePaymentMethod: "UPI",
    flatFeePaymentSentAt: now,
  },
});

const workshopSessions = [
  { name: "House Foundations", maxCompetitors: 20, entryFee: 400 },
  { name: "Footwork & Hustle", maxCompetitors: 20, entryFee: 400 },
  { name: "Open Groove Cypher", maxCompetitors: 30, entryFee: 200 },
];

const sessionIds = [];
for (const session of workshopSessions) {
  const cat = await prisma.category.create({
    data: {
      eventId: workshop.id,
      name: session.name,
      format: "SOLO",
      minMembers: 1,
      maxMembers: 1,
      maxCompetitors: session.maxCompetitors,
      entryFee: session.entryFee,
      entryCurrency: "INR",
    },
  });
  sessionIds.push(cat.id);
}

// A few artists join the workshop sessions (paid)
const workshopJoins: Array<[number, number]> = [
  [0, 0], [2, 0], [5, 1], [8, 1], [11, 2], [14, 2], [17, 0], [20, 2],
];
let wsSeed = 1;
for (const [artistIndex, sessionIndex] of workshopJoins) {
  await prisma.registration.create({
    data: {
      userId: artists[artistIndex].id,
      categoryId: sessionIds[sessionIndex],
      status: "CONFIRMED",
      entryFee: workshopSessions[sessionIndex].entryFee,
      entryCurrency: "INR",
      paid: true,
      paidAt: now,
      seed: wsSeed,
      style: artists[artistIndex].style,
      crew: artists[artistIndex].crew,
      city: artists[artistIndex].city,
      country: "India",
      experience: artists[artistIndex].experience,
      socialHandle: artists[artistIndex].socialHandle,
      referral: artists[artistIndex].referral,
      members: {
        create: [{ categoryId: sessionIds[sessionIndex], userId: artists[artistIndex].id, role: "CAPTAIN", status: "ACCEPTED", acceptedAt: now }],
      },
    },
  });
  wsSeed++;
}

// ---- Dance competition event (single-point scoring, auto Qualifiers + Finals) ----
const championship = await prisma.event.create({
  data: {
    title: "National Dance Championship 2026",
    slug: "national-dance-championship-2026",
    description:
      "A judged solo and group dance competition. Performers are scored 0-10 by a live panel with feedback — no eliminations in prelims, top scorers advance to finals.",
    eventType: EventType.DANCE_COMPETITION,
    venue: "Rabindra Bhawan",
    city: "Guwahati",
    state: "Assam",
    status: "PUBLISHED",
    startsAt: future(25),
    organizerId: organizer.id,
    categoryCount: 3,
    flatFee: 99,
    flatFeePaid: true,
    flatFeePaidAt: now,
    flatFeePaymentStatus: "VERIFIED",
    flatFeePaymentMethod: "UPI",
    flatFeePaymentSentAt: now,
  },
});

const competitionCategories = [];
const competitionDefs = [
  { name: "Solo Dance", format: "SOLO" as const, minMembers: 1, maxMembers: 1, maxCompetitors: 24, entryFee: 800 },
  { name: "Duo Performance", format: "DUO" as const, minMembers: 2, maxMembers: 2, maxCompetitors: 16, entryFee: 1200 },
  { name: "Group Performance", format: "GROUP" as const, minMembers: 4, maxMembers: 12, maxCompetitors: 12, entryFee: 1500 },
];
for (let ci = 0; ci < competitionDefs.length; ci++) {
  const def = competitionDefs[ci];
  const cat = await prisma.category.create({
    data: {
      eventId: championship.id,
      name: def.name,
      format: def.format,
      minMembers: def.minMembers,
      maxMembers: def.maxMembers,
      maxCompetitors: def.maxCompetitors,
      entryFee: def.entryFee,
      entryCurrency: "INR",
    },
  });
  await prisma.roundFormat.createMany({
    data: [
      { categoryId: cat.id, order: 1, type: RoundType.QUALIFIER, label: "Qualifiers", phaseStatus: "PENDING" },
      { categoryId: cat.id, order: 2, type: RoundType.QUALIFIER, label: "Finals", phaseStatus: "PENDING" },
    ],
  });
  await prisma.judgeSlot.create({
      data: { code: `DNC00${ci + 1}`, name: "Panel Judge", eventId: championship.id, categoryId: cat.id, isActive: true },
  });
  competitionCategories.push(cat);
}

// A few artists enter the competition (paid)
const competitionEntries: Array<[number, number]> = [
  [1, 0], [3, 0], [4, 0], [7, 0], [9, 0], [12, 0], [18, 0], [22, 0], [25, 0], [28, 0],
  [0, 1], [6, 1], [13, 1], [21, 1], [26, 1],
];
let compSeed = 1;
for (const [artistIndex, catIndex] of competitionEntries) {
  await prisma.registration.create({
      data: {
      userId: artists[artistIndex].id,
      categoryId: competitionCategories[catIndex].id,
      status: "CONFIRMED",
      entryFee: competitionDefs[catIndex].entryFee,
      entryCurrency: "INR",
      paid: true,
      paidAt: now,
      seed: compSeed,
      style: artists[artistIndex].style,
      crew: artists[artistIndex].crew,
      city: artists[artistIndex].city,
      country: "India",
      experience: artists[artistIndex].experience,
      socialHandle: artists[artistIndex].socialHandle,
        referral: artists[artistIndex].referral,
        format: competitionDefs[catIndex].format,
        teamName: catIndex === 1 ? `${artists[artistIndex].name ?? "Duo"} Pair` : null,
        members: {
          create: [
            { categoryId: competitionCategories[catIndex].id, userId: artists[artistIndex].id, role: "CAPTAIN", status: "ACCEPTED", acceptedAt: now },
            ...(catIndex === 1 ? [{ categoryId: competitionCategories[catIndex].id, userId: artists[(artistIndex + 1) % artists.length].id, role: "MEMBER" as const, status: "ACCEPTED" as const, acceptedAt: now }] : []),
          ],
        },
    },
  });
  compSeed++;
}

console.log("Seed complete: 1 organizer, 30 artists, 3 events (battle/workshop/competition), 8 workshop sessions+competition categories, 12 judge slots, 53 registrations, 3 prize pools, 10 feedback templates, 6 gigs, 8 achievements, 3 gig applications");

await prisma.$disconnect();
