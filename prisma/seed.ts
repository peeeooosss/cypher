import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  UserRole,
  RoundType,
  Skill,
  EventType,
  CategoryFormat,
  RegistrationMemberRole,
  RegistrationMemberStatus,
} from "../src/generated/prisma/enums";

const password = process.env.SEED_PASSWORD ?? "password";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be configured");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const passwordHash = await hash(password, 12);
const now = new Date();

// ============================================================
// 1. WIPE — delete everything except admin user
// ============================================================
await prisma.gigApplication.deleteMany({});
await prisma.artistAchievement.deleteMany({});
await prisma.feedback.deleteMany({});
await prisma.scoreAuditLog.deleteMany({});
await prisma.battleTimer.deleteMany({});
await prisma.matchScore.deleteMany({});
await prisma.judgeAssignment.deleteMany({});
await prisma.dancerScore.deleteMany({});
await prisma.feedbackTemplate.deleteMany({});
await prisma.prizePool.deleteMany({});
await prisma.registrationMember.deleteMany({});
await prisma.registration.deleteMany({});
await prisma.judgeSlot.deleteMany({});
await prisma.roundFormat.deleteMany({});
await prisma.category.deleteMany({});
await prisma.battleMatch.deleteMany({});
await prisma.event.deleteMany({});
await prisma.gig.deleteMany({});
await prisma.user.deleteMany({ where: { role: { not: UserRole.ADMIN } } });

console.log("Database wiped.");

// ============================================================
// 2. ADMIN — upsert so it survives the wipe
// ============================================================
await prisma.user.upsert({
  where: { email: "admin@callout.local" },
  update: { name: "CYPHR Admin", role: UserRole.ADMIN, passwordHash },
  create: { email: "admin@callout.local", name: "CYPHR Admin", role: UserRole.ADMIN, passwordHash },
});

// ============================================================
// 3. ORGANIZERS
// ============================================================
const organizer1 = await prisma.user.create({
  data: {
    email: "organizer1@callout.local",
    name: "Mumbai Cypher Collective",
    role: UserRole.ORGANIZER,
    passwordHash,
    upiId: "mumbaicypher@upi",
  },
});

const organizer2 = await prisma.user.create({
  data: {
    email: "organizer2@callout.local",
    name: "Northeast Groove Society",
    role: UserRole.ORGANIZER,
    passwordHash,
    upiId: "negroove@upi",
  },
});

// ============================================================
// 4. ARTISTS (20)
// ============================================================
const artistDefs: Array<{
  name: string;
  username: string;
  style: string;
  crew: string | null;
  city: string;
  experience: string;
  socialHandle: string;
  skills: Skill[];
}> = [
  { name: "Rohan Mehta", username: "rohanm", style: "Breaking", crew: "Soul Mechanics", city: "Mumbai", experience: "ADVANCED", socialHandle: "@rohanbreaks", skills: ["DANCER", "CHOREOGRAPHER"] },
  { name: "Ayesha Khan", username: "ayeshak", style: "Popping", crew: null, city: "Delhi", experience: "PRO", socialHandle: "@ayeshapops", skills: ["DANCER", "PERFORMER"] },
  { name: "Vikram Singh", username: "vikrams", style: "Hip-Hop", crew: "Concrete Kings", city: "Pune", experience: "INTERMEDIATE", socialHandle: "@vikramflows", skills: ["DANCER", "MC"] },
  { name: "Priya Das", username: "priyad", style: "Locking", crew: "Flow State", city: "Kolkata", experience: "ADVANCED", socialHandle: "@priyalocks", skills: ["DANCER", "CHOREOGRAPHER"] },
  { name: "Arjun Nair", username: "arjunn", style: "Breaking", crew: "Floor Assassins", city: "Chennai", experience: "PRO", socialHandle: "@arjunbreaks", skills: ["DANCER", "DJ"] },
  { name: "Neha Gupta", username: "nehag", style: "House", crew: null, city: "Mumbai", experience: "ADVANCED", socialHandle: "@nehahouses", skills: ["DANCER", "PERFORMER"] },
  { name: "Karan Malhotra", username: "karans", style: "Breaking", crew: "Rhythm Killers", city: "Jaipur", experience: "INTERMEDIATE", socialHandle: "@karanbboy", skills: ["DANCER"] },
  { name: "Sana Patel", username: "sanap", style: "Hip-Hop", crew: null, city: "Ahmedabad", experience: "ADVANCED", socialHandle: "@sanahiphop", skills: ["DANCER", "RAPPER"] },
  { name: "Ravi Kumar", username: "ravik", style: "Breaking", crew: "Concrete Kings", city: "Bangalore", experience: "PRO", socialHandle: "@ravibreaks", skills: ["DANCER", "CHOREOGRAPHER"] },
  { name: "Meera Reddy", username: "meerar", style: "Popping", crew: "Flow State", city: "Hyderabad", experience: "ADVANCED", socialHandle: "@meerapops", skills: ["DANCER", "DJ"] },
  { name: "Amit Sharma", username: "amits", style: "Hip-Hop", crew: "Soul Mechanics", city: "Delhi", experience: "INTERMEDIATE", socialHandle: "@amithiphop", skills: ["DANCER", "BEATBOXER"] },
  { name: "Divya Menon", username: "divyam", style: "Locking", crew: null, city: "Chennai", experience: "ADVANCED", socialHandle: "@divyalocks", skills: ["DANCER", "PERFORMER"] },
  { name: "Siddharth Rao", username: "sidr", style: "Breaking", crew: "Floor Assassins", city: "Mumbai", experience: "PRO", socialHandle: "@siddharthbreaks", skills: ["DANCER", "MC", "CHOREOGRAPHER"] },
  { name: "Tanya Joshi", username: "tanyaj", style: "House", crew: "Rhythm Killers", city: "Pune", experience: "INTERMEDIATE", socialHandle: "@tanyahouse", skills: ["DANCER"] },
  { name: "Rahul Verma", username: "rahulv", style: "Breaking", crew: null, city: "Guwahati", experience: "ADVANCED", socialHandle: "@rahulbreaks", skills: ["DANCER", "DJ"] },
  { name: "Ishita Banerjee", username: "ishitab", style: "Hip-Hop", crew: "Concrete Kings", city: "Kolkata", experience: "ADVANCED", socialHandle: "@ishitahiphop", skills: ["DANCER", "CHOREOGRAPHER", "PERFORMER"] },
  { name: "Aditya Kulkarni", username: "adik", style: "Breaking", crew: "Soul Mechanics", city: "Bangalore", experience: "INTERMEDIATE", socialHandle: "@adityaboy", skills: ["DANCER"] },
  { name: "Kavya Iyer", username: "kavyai", style: "Popping", crew: null, city: "Chennai", experience: "ADVANCED", socialHandle: "@kavyapops", skills: ["DANCER", "VOCALIST"] },
  { name: "Mohit Tiwari", username: "mohitt", style: "Hip-Hop", crew: "Flow State", city: "Lucknow", experience: "PRO", socialHandle: "@mohithiphop", skills: ["DANCER", "RAPPER", "PRODUCER"] },
  { name: "Ananya Sen", username: "ananyas", style: "Locking", crew: "Rhythm Killers", city: "Guwahati", experience: "INTERMEDIATE", socialHandle: "@ananyalocks", skills: ["DANCER", "MC"] },
];

const artists = [];
for (const def of artistDefs) {
  const user = await prisma.user.create({
    data: {
      email: `${def.username}@callout.local`,
      name: def.name,
      username: def.username,
      role: UserRole.ARTIST,
      passwordHash,
      style: def.style,
      crew: def.crew,
      city: def.city,
      country: "India",
      experience: def.experience,
      socialHandle: def.socialHandle,
      referral: "Instagram",
      skills: def.skills,
    },
  });
  artists.push(user);
}

console.log("Created 2 organizers + 20 artists.");

// ============================================================
// 5. EVENTS
// ============================================================
function future(days: number) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

// --- Event 1: Underground Battle ---
const battleEvent = await prisma.event.create({
  data: {
    title: "Mumbai Underground Cypher",
    slug: "mumbai-underground-cypher-2026",
    description:
      "Raw underground breaking battles. No frills, no filters — just skill, music, and the floor. Three style categories, live judges, cash prizes. Bring your A-game.",
    eventType: EventType.UNDERGROUND_BATTLE,
    venue: "The Underground",
    city: "Mumbai",
    state: "Maharashtra",
    status: "PUBLISHED",
    startsAt: future(10),
    organizerId: organizer1.id,
    categoryCount: 3,
    flatFee: 299,
    flatFeePaid: true,
    flatFeePaidAt: now,
    flatFeePaymentStatus: "VERIFIED",
    flatFeePaymentMethod: "UPI",
    flatFeePaymentSentAt: now,
  },
});

const battleBreaking = await prisma.category.create({
  data: { eventId: battleEvent.id, name: "Breaking", format: CategoryFormat.BATTLE_1V1, minMembers: 1, maxMembers: 1, maxCompetitors: 32, entryFee: 500, entryCurrency: "INR" },
});
const battlePopping = await prisma.category.create({
  data: { eventId: battleEvent.id, name: "Popping", format: CategoryFormat.BATTLE_1V1, minMembers: 1, maxMembers: 1, maxCompetitors: 16, entryFee: 500, entryCurrency: "INR" },
});
const battleHiphop = await prisma.category.create({
  data: { eventId: battleEvent.id, name: "Hip-Hop", format: CategoryFormat.BATTLE_1V1, minMembers: 1, maxMembers: 1, maxCompetitors: 16, entryFee: 500, entryCurrency: "INR" },
});

// Round phases for battle categories
for (const cat of [battleBreaking, battlePopping, battleHiphop]) {
  await prisma.roundFormat.createMany({
    data: [
      { categoryId: cat.id, order: 1, type: RoundType.CYPHER, label: "Cypher Round", roundCount: 1, roundDuration: 60, advanceCount: 8, phaseStatus: "PENDING" },
      { categoryId: cat.id, order: 2, type: RoundType.BATTLE_1V1, label: "Top 8", roundCount: 2, roundDuration: 30, phaseStatus: "PENDING" },
      { categoryId: cat.id, order: 3, type: RoundType.FINAL, label: "Finals", roundCount: 3, roundDuration: 45, phaseStatus: "PENDING" },
    ],
  });
  await prisma.category.update({ where: { id: cat.id }, data: { currentPhaseOrder: 1 } });
}

// Judge slots — battle event
for (const [cat, code] of [[battleBreaking, "BRK"], [battlePopping, "POP"], [battleHiphop, "HIP"]] as const) {
  for (let i = 1; i <= 3; i++) {
    const names = ["Head Judge", "Score Judge", "Tech Judge"];
    await prisma.judgeSlot.create({
      data: { code: `${code}00${i}`, name: names[i - 1], eventId: battleEvent.id, categoryId: cat.id, isActive: true },
    });
  }
}

// Prize pools — battle event
const prizeDistribution = [
  { rank: 1, label: "Winner", pct: 50 },
  { rank: 2, label: "Runner-up", pct: 30 },
  { rank: 3, label: "Semi-finalist", pct: 20 },
];
await prisma.prizePool.create({ data: { categoryId: battleBreaking.id, totalAmount: 100000, currency: "INR", distribution: prizeDistribution } });
await prisma.prizePool.create({ data: { categoryId: battlePopping.id, totalAmount: 50000, currency: "INR", distribution: prizeDistribution } });
await prisma.prizePool.create({ data: { categoryId: battleHiphop.id, totalAmount: 50000, currency: "INR", distribution: prizeDistribution } });

console.log("Created battle event with 3 categories + rounds + judge slots + prize pools.");

// --- Event 2: Dance Competition ---
const danceCompEvent = await prisma.event.create({
  data: {
    title: "Delhi Dance Open 2026",
    slug: "delhi-dance-open-2026",
    description:
      "A judged solo and duo dance competition. Performers scored 0–10 by a live panel. No eliminations in prelims — top scorers advance to finals. Cash prizes and trophies.",
    eventType: EventType.DANCE_COMPETITION,
    venue: "Jawaharlal Nehru Stadium",
    city: "Delhi",
    state: "Delhi",
    status: "PUBLISHED",
    startsAt: future(20),
    organizerId: organizer1.id,
    categoryCount: 2,
    flatFee: 199,
    flatFeePaid: true,
    flatFeePaidAt: now,
    flatFeePaymentStatus: "VERIFIED",
    flatFeePaymentMethod: "UPI",
    flatFeePaymentSentAt: now,
  },
});

const compSolo = await prisma.category.create({
  data: { eventId: danceCompEvent.id, name: "Solo Dance", format: CategoryFormat.SOLO, minMembers: 1, maxMembers: 1, maxCompetitors: 24, entryFee: 800, entryCurrency: "INR" },
});
const compDuo = await prisma.category.create({
  data: { eventId: danceCompEvent.id, name: "Duo Performance", format: CategoryFormat.DUO, minMembers: 2, maxMembers: 2, maxCompetitors: 16, entryFee: 1200, entryCurrency: "INR" },
});

for (const cat of [compSolo, compDuo]) {
  await prisma.roundFormat.createMany({
    data: [
      { categoryId: cat.id, order: 1, type: RoundType.QUALIFIER, label: "Qualifiers", roundCount: 1, roundDuration: 120, advanceCount: 8, phaseStatus: "PENDING" },
      { categoryId: cat.id, order: 2, type: RoundType.FINAL, label: "Finals", roundCount: 3, roundDuration: 60, phaseStatus: "PENDING" },
    ],
  });
  await prisma.category.update({ where: { id: cat.id }, data: { currentPhaseOrder: 1 } });
}

await prisma.judgeSlot.create({ data: { code: "DNC001", name: "Panel Judge 1", eventId: danceCompEvent.id, categoryId: compSolo.id, isActive: true } });
await prisma.judgeSlot.create({ data: { code: "DNC002", name: "Panel Judge 2", eventId: danceCompEvent.id, categoryId: compSolo.id, isActive: true } });
await prisma.judgeSlot.create({ data: { code: "DNC003", name: "Panel Judge 1", eventId: danceCompEvent.id, categoryId: compDuo.id, isActive: true } });
await prisma.judgeSlot.create({ data: { code: "DNC004", name: "Panel Judge 2", eventId: danceCompEvent.id, categoryId: compDuo.id, isActive: true } });

console.log("Created dance competition event with 2 categories.");

// --- Event 3: Music Competition ---
const musicCompEvent = await prisma.event.create({
  data: {
    title: "Guwahati Music Clash",
    slug: "guwahati-music-clash-2026",
    description:
      "Hip-hop music competition — rap battles and producer showcases. Beatmakers bring their best instrumentals, MCs spit bars. Judges score on delivery, flow, and crowd impact.",
    eventType: EventType.MUSIC_COMPETITION,
    venue: "Rabindra Bhawan",
    city: "Guwahati",
    state: "Assam",
    status: "PUBLISHED",
    startsAt: future(28),
    organizerId: organizer2.id,
    categoryCount: 2,
    flatFee: 149,
    flatFeePaid: true,
    flatFeePaidAt: now,
    flatFeePaymentStatus: "VERIFIED",
    flatFeePaymentMethod: "UPI",
    flatFeePaymentSentAt: now,
  },
});

const musicRap = await prisma.category.create({
  data: { eventId: musicCompEvent.id, name: "Rap Battle", format: CategoryFormat.SOLO, minMembers: 1, maxMembers: 1, maxCompetitors: 16, entryFee: 400, entryCurrency: "INR" },
});
const musicProducer = await prisma.category.create({
  data: { eventId: musicCompEvent.id, name: "Producer Showcase", format: CategoryFormat.SOLO, minMembers: 1, maxMembers: 1, maxCompetitors: 12, entryFee: 600, entryCurrency: "INR" },
});

for (const cat of [musicRap, musicProducer]) {
  await prisma.roundFormat.createMany({
    data: [
      { categoryId: cat.id, order: 1, type: RoundType.QUALIFIER, label: "Qualifiers", roundCount: 1, roundDuration: 90, advanceCount: 6, phaseStatus: "PENDING" },
      { categoryId: cat.id, order: 2, type: RoundType.FINAL, label: "Finals", roundCount: 3, roundDuration: 45, phaseStatus: "PENDING" },
    ],
  });
  await prisma.category.update({ where: { id: cat.id }, data: { currentPhaseOrder: 1 } });
}

await prisma.judgeSlot.create({ data: { code: "MUS001", name: "Head Judge", eventId: musicCompEvent.id, categoryId: musicRap.id, isActive: true } });
await prisma.judgeSlot.create({ data: { code: "MUS002", name: "Panel Judge", eventId: musicCompEvent.id, categoryId: musicRap.id, isActive: true } });
await prisma.judgeSlot.create({ data: { code: "MUS003", name: "Head Judge", eventId: musicCompEvent.id, categoryId: musicProducer.id, isActive: true } });

console.log("Created music competition event with 2 categories.");

// --- Event 4: Hip-Hop Workshop ---
const workshopEvent = await prisma.event.create({
  data: {
    title: "Shillong Hip-Hop Intensive",
    slug: "shillong-hiphop-intensive-2026",
    description:
      "A 2-day intensive hip-hop workshop. Learn breaking foundations, freestyle techniques, and beatbox from some of the best in the scene. Open to all levels — bring your energy.",
    eventType: EventType.WORKSHOP,
    venue: "Blue Diamond Cultural Centre",
    city: "Shillong",
    state: "Meghalaya",
    status: "PUBLISHED",
    startsAt: future(15),
    organizerId: organizer2.id,
    categoryCount: 3,
    flatFee: 99,
    flatFeePaid: true,
    flatFeePaidAt: now,
    flatFeePaymentStatus: "VERIFIED",
    flatFeePaymentMethod: "UPI",
    flatFeePaymentSentAt: now,
  },
});

const wsBreaking = await prisma.category.create({
  data: { eventId: workshopEvent.id, name: "B-Boy Fundamentals", format: CategoryFormat.SOLO, minMembers: 1, maxMembers: 1, maxCompetitors: 30, entryFee: 300, entryCurrency: "INR" },
});
const wsFreestyle = await prisma.category.create({
  data: { eventId: workshopEvent.id, name: "Freestyle Session", format: CategoryFormat.SOLO, minMembers: 1, maxMembers: 1, maxCompetitors: 25, entryFee: 250, entryCurrency: "INR" },
});
const wsBeatbox = await prisma.category.create({
  data: { eventId: workshopEvent.id, name: "Beatbox Workshop", format: CategoryFormat.SOLO, minMembers: 1, maxMembers: 1, maxCompetitors: 20, entryFee: 200, entryCurrency: "INR" },
});

console.log("Created workshop event with 3 sessions.");

// ============================================================
// 6. REGISTRATIONS
// ============================================================

// --- Battle event registrations (15 artists, paid) ---
const battleRegs = [
  { artistIdx: 0, cat: battleBreaking },
  { artistIdx: 2, cat: battleBreaking },
  { artistIdx: 4, cat: battleBreaking },
  { artistIdx: 6, cat: battleBreaking },
  { artistIdx: 8, cat: battleBreaking },
  { artistIdx: 10, cat: battlePopping },
  { artistIdx: 12, cat: battlePopping },
  { artistIdx: 14, cat: battlePopping },
  { artistIdx: 16, cat: battlePopping },
  { artistIdx: 18, cat: battlePopping },
  { artistIdx: 1, cat: battleHiphop },
  { artistIdx: 3, cat: battleHiphop },
  { artistIdx: 5, cat: battleHiphop },
  { artistIdx: 7, cat: battleHiphop },
  { artistIdx: 9, cat: battleHiphop },
];

for (const reg of battleRegs) {
  const artist = artists[reg.artistIdx];
  await prisma.registration.create({
    data: {
      userId: artist.id,
      categoryId: reg.cat.id,
      status: "CONFIRMED",
      format: CategoryFormat.BATTLE_1V1,
      entryFee: reg.cat.entryFee,
      entryCurrency: "INR",
      paid: true,
      paidAt: now,
      paidClaimedAt: now,
      seed: 1,
      style: artist.style,
      crew: artist.crew,
      city: artist.city,
      country: "India",
      experience: artist.experience,
      socialHandle: artist.socialHandle,
      referral: "Instagram",
      members: {
        create: [{ categoryId: reg.cat.id, userId: artist.id, role: RegistrationMemberRole.CAPTAIN, status: RegistrationMemberStatus.ACCEPTED, acceptedAt: now }],
      },
    },
  });
}

// --- Dance competition: solo entries (8 artists) ---
const soloEntries = [0, 1, 3, 5, 8, 11, 13, 17];
for (const artistIdx of soloEntries) {
  const artist = artists[artistIdx];
  await prisma.registration.create({
    data: {
      userId: artist.id,
      categoryId: compSolo.id,
      status: "CONFIRMED",
      format: CategoryFormat.SOLO,
      entryFee: compSolo.entryFee,
      entryCurrency: "INR",
      paid: true,
      paidAt: now,
      paidClaimedAt: now,
      seed: 1,
      style: artist.style,
      crew: artist.crew,
      city: artist.city,
      country: "India",
      experience: artist.experience,
      socialHandle: artist.socialHandle,
      referral: "Friend",
      members: {
        create: [{ categoryId: compSolo.id, userId: artist.id, role: RegistrationMemberRole.CAPTAIN, status: RegistrationMemberStatus.ACCEPTED, acceptedAt: now }],
      },
    },
  });
}

// --- Dance competition: duo entries (4 pairs) ---
const duoPairs = [[2, 3], [6, 7], [12, 13], [16, 17]];
for (const [a1, a2] of duoPairs) {
  const captain = artists[a1];
  const mate = artists[a2];
  await prisma.registration.create({
    data: {
      userId: captain.id,
      categoryId: compDuo.id,
      status: "CONFIRMED",
      format: CategoryFormat.DUO,
      entryFee: compDuo.entryFee,
      entryCurrency: "INR",
      paid: true,
      paidAt: now,
      paidClaimedAt: now,
      seed: 1,
      teamName: `${captain.name} & ${mate.name}`,
      style: captain.style,
      crew: captain.crew,
      city: captain.city,
      country: "India",
      experience: captain.experience,
      socialHandle: captain.socialHandle,
      referral: "Crew",
      members: {
        create: [
          { categoryId: compDuo.id, userId: captain.id, role: RegistrationMemberRole.CAPTAIN, status: RegistrationMemberStatus.ACCEPTED, acceptedAt: now },
          { categoryId: compDuo.id, userId: mate.id, role: RegistrationMemberRole.MEMBER, status: RegistrationMemberStatus.ACCEPTED, acceptedAt: now },
        ],
      },
    },
  });
}

// --- Music competition: rap battle (6 artists) ---
const rapArtists = [1, 7, 10, 14, 18, 19];
for (const artistIdx of rapArtists) {
  const artist = artists[artistIdx];
  await prisma.registration.create({
    data: {
      userId: artist.id,
      categoryId: musicRap.id,
      status: "CONFIRMED",
      format: CategoryFormat.SOLO,
      entryFee: musicRap.entryFee,
      entryCurrency: "INR",
      paid: true,
      paidAt: now,
      paidClaimedAt: now,
      seed: 1,
      style: artist.style,
      crew: artist.crew,
      city: artist.city,
      country: "India",
      experience: artist.experience,
      socialHandle: artist.socialHandle,
      referral: "Instagram",
      members: {
        create: [{ categoryId: musicRap.id, userId: artist.id, role: RegistrationMemberRole.CAPTAIN, status: RegistrationMemberStatus.ACCEPTED, acceptedAt: now }],
      },
    },
  });
}

// --- Music competition: producer showcase (4 artists, paidClaimedAt only — pending) ---
const producerArtists = [9, 15, 17, 19];
for (const artistIdx of producerArtists) {
  const artist = artists[artistIdx];
  await prisma.registration.create({
    data: {
      userId: artist.id,
      categoryId: musicProducer.id,
      status: "CONFIRMED",
      format: CategoryFormat.SOLO,
      entryFee: musicProducer.entryFee,
      entryCurrency: "INR",
      paid: false,
      seed: 1,
      style: artist.style,
      crew: artist.crew,
      city: artist.city,
      country: "India",
      experience: artist.experience,
      socialHandle: artist.socialHandle,
      referral: "TikTok",
      members: {
        create: [{ categoryId: musicProducer.id, userId: artist.id, role: RegistrationMemberRole.CAPTAIN, status: RegistrationMemberStatus.ACCEPTED, acceptedAt: now }],
      },
    },
  });
}

// --- Workshop registrations (8 artists, paid) ---
const workshopRegs: Array<[number, typeof wsBreaking]> = [
  [0, wsBreaking], [4, wsBreaking], [6, wsBreaking],
  [2, wsFreestyle], [8, wsFreestyle], [11, wsFreestyle],
  [5, wsBeatbox], [13, wsBeatbox],
];
for (const [artistIdx, cat] of workshopRegs) {
  const artist = artists[artistIdx];
  await prisma.registration.create({
    data: {
      userId: artist.id,
      categoryId: cat.id,
      status: "CONFIRMED",
      format: CategoryFormat.SOLO,
      entryFee: cat.entryFee,
      entryCurrency: "INR",
      paid: true,
      paidAt: now,
      paidClaimedAt: now,
      seed: 1,
      style: artist.style,
      crew: artist.crew,
      city: artist.city,
      country: "India",
      experience: artist.experience,
      socialHandle: artist.socialHandle,
      referral: "Friend",
      members: {
        create: [{ categoryId: cat.id, userId: artist.id, role: RegistrationMemberRole.CAPTAIN, status: RegistrationMemberStatus.ACCEPTED, acceptedAt: now }],
      },
    },
  });
}

console.log("Created all registrations.");

// ============================================================
// 7. GIGS (marketplace)
// ============================================================
const gigData = [
  {
    title: "DJ for Saturday cypher night",
    description: "Need a DJ comfortable with open-format battles — quick cuts, scratch-friendly, can read a crowd in a 2x2 floor setup. 4-hour set.",
    skillsRequired: ["DJ" as Skill, "DANCER" as Skill],
    location: "The Underground, Mumbai",
    budget: 8000,
    startsAt: future(5),
    status: "OPEN" as const,
  },
  {
    title: "Choreographer for music video",
    description: "Looking for a choreographer to build and rehearse a 90-second routine for an upcoming hip-hop single. 3 shoot days, travel covered.",
    skillsRequired: ["CHOREOGRAPHER" as Skill, "DANCER" as Skill],
    location: "Delhi",
    budget: 25000,
    startsAt: future(12),
    status: "OPEN" as const,
  },
  {
    title: "MC / host for open-mic cypher",
    description: "Host our monthly open-mic cypher — warm up the room, hype the battles, keep energy between rounds. Two-hour show.",
    skillsRequired: ["MC" as Skill],
    location: "Shillong",
    budget: 6000,
    startsAt: future(18),
    status: "OPEN" as const,
  },
  {
    title: "Guitarist for live beat set",
    description: "One-off live set with a hip-hop producer — need a guitarist who can improvise over beats and keep up with tempo changes. Bring your own pedal board.",
    skillsRequired: ["GUITARIST" as Skill, "VOCALIST" as Skill],
    location: "Guwahati",
    budget: 12000,
    startsAt: future(8),
    status: "OPEN" as const,
  },
  {
    title: "Dancers for festival performance",
    description: "Festival stage in front of ~2000 people. Need 4 dancers for a 6-minute routine. Rehearsals paid. All styles welcome.",
    skillsRequired: ["DANCER" as Skill, "PERFORMER" as Skill],
    location: "Mumbai",
    budget: 15000,
    startsAt: future(25),
    status: "FILLED" as const,
  },
  {
    title: "Beatboxer for workshop demo",
    description: "Need a beatboxer to do a 30-minute demo at a hip-hop workshop. Show basic techniques, loop station use, and crowd interaction.",
    skillsRequired: ["BEATBOXER" as Skill],
    location: "Pune",
    budget: 5000,
    startsAt: future(14),
    status: "OPEN" as const,
  },
];

const gigs = [];
for (const def of gigData) {
  const gig = await prisma.gig.create({
    data: {
      organizerId: organizer1.id,
      ...def,
      currency: "INR",
      feePaid: true,
      feePaidAt: now,
    },
  });
  gigs.push(gig);
}

console.log("Created 6 gigs.");

// ============================================================
// 8. ARTIST ACHIEVEMENTS
// ============================================================
const achievementData = [
  { artistIdx: 0, title: "Champion", competition: "Mumbai Street Clash 2025", placement: "1st", year: 2025, prize: 30000 },
  { artistIdx: 4, title: "Runner-up", competition: "South India Breaking Open", placement: "2nd", year: 2024, prize: 15000 },
  { artistIdx: 8, title: "Winner", competition: "Delhi Cypher League", placement: "1st", year: 2025, prize: 40000 },
  { artistIdx: 12, title: "Semi-finalist", competition: "National B-Boy Showcase", placement: "Semi-final", year: 2024, prize: 8000 },
  { artistIdx: 18, title: "Champion", competition: "Northeast Hip-Hop Awards", placement: "1st", year: 2025, prize: 25000 },
];

for (const def of achievementData) {
  await prisma.artistAchievement.create({
    data: {
      userId: artists[def.artistIdx].id,
      title: def.title,
      competition: def.competition,
      placement: def.placement,
      year: def.year,
      prize: def.prize,
      currency: "INR",
    },
  });
}

// ============================================================
// 9. GIG APPLICATIONS
// ============================================================
await prisma.gigApplication.create({
  data: { gigId: gigs[0].id, artistId: artists[4].id, message: "I spin open-format battles weekly and can scratch between rounds. 4-hour set is no problem.", status: "ACCEPTED" },
});
await prisma.gigApplication.create({
  data: { gigId: gigs[1].id, artistId: artists[3].id, message: "Choreographed 3 music videos this year. Tight shoot schedules are my thing.", status: "PENDING" },
});
await prisma.gigApplication.create({
  data: { gigId: gigs[3].id, artistId: artists[10].id, message: "I play guitar over lo-fi hip-hop beats regularly. Happy to improvise and adapt on the fly.", status: "PENDING" },
});

console.log("Created achievements + gig applications.");

// ============================================================
// DONE
// ============================================================
console.log("\n=== Seed Complete ===");
console.log("1 admin | 2 organizers | 20 artists");
console.log("4 events: Battle + Dance Comp + Music Comp + Workshop");
console.log("50+ registrations across all events");
console.log("6 gigs | 5 achievements | 3 gig applications");

await prisma.$disconnect();
