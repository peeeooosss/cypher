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