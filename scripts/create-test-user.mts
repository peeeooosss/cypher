import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL must be configured");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const email = "payutest@callout.local";
const password = "payutest-pass-123";
const passwordHash = await hash(password, 12);

const user = await prisma.user.upsert({
  where: { email },
  update: {
    gigWorkPaymentStatus: "NONE",
    gigWorkExpiresAt: null,
    gigWorkEnabledAt: null,
    gigWorkPaidAt: null,
    gigWorkPaymentMethod: null,
    gigWorkPaymentSentAt: null,
    gigWorkPaymentVerifiedBy: null,
  },
  create: {
    email,
    name: "PayU Salt Test",
    role: "ARTIST",
    passwordHash,
    city: "Mumbai",
    country: "India",
    experience: "INTERMEDIATE",
  },
});

const deleted = await prisma.payment.deleteMany({
  where: { payerId: user.id, provider: "PAYU", status: "PENDING" },
});

console.log(`user id   : ${user.id}`);
console.log(`email     : ${email}`);
console.log(`password  : ${password}`);
console.log(`role      : ${user.role}`);
console.log(`gig work  : ${user.gigWorkPaymentStatus}`);
console.log(`cleaned   : ${deleted.count} stuck PENDING payment(s)`);

await prisma.$disconnect();
