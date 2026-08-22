import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL must be configured");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const email = "payutest@callout.local";
const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
if (!user) throw new Error("Test user not found");

const deleted = await prisma.payment.deleteMany({
  where: { payerId: user.id, provider: "PAYU", status: "PENDING" },
});

const active = await prisma.payment.findMany({
  where: { payerId: user.id, provider: "PAYU" },
  select: { id: true, status: true, merchantTransactionId: true },
});

console.log(`cleaned  : ${deleted.count} stuck PENDING payment(s)`);
console.log(`remaining: ${active.length} PAYU payment(s)`, active.map(p => `${p.status}(${p.merchantTransactionId})`).join(", ") || "none");

await prisma.$disconnect();
