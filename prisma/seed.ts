import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { UserRole } from "../src/generated/prisma/enums";

const password = process.env.SEED_PASSWORD;

if (!password) {
  throw new Error("SEED_PASSWORD must be set before running the seed script");
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL must be configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const users = [
  { email: "organizer@callout.local", name: "CallOut Organizer", role: UserRole.ORGANIZER },
  { email: "artist@callout.local", name: "CallOut Artist", role: UserRole.ARTIST },
  { email: "judge@callout.local", name: "CallOut Judge", role: UserRole.JUDGE },
];

const passwordHash = await hash(password, 12);

for (const user of users) {
  await prisma.user.upsert({
    where: { email: user.email },
    update: { name: user.name, role: user.role, passwordHash },
    create: { ...user, passwordHash },
  });
}

await prisma.$disconnect();
