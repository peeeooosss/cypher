import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL must be configured");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const email = "payutest@callout.local";
const user = await prisma.user.findUnique({
  where: { email },
  select: {
    id: true,
    gigWorkPaymentStatus: true,
    gigWorkPaidAt: true,
    gigWorkPaymentMethod: true,
    gigWorkPaymentVerifiedBy: true,
  },
});

if (!user) { console.log("user not found"); process.exit(1); }

const payments = await prisma.payment.findMany({
  where: { payerId: user.id, provider: "PAYU" },
  orderBy: { createdAt: "desc" },
  select: {
    id: true,
    status: true,
    merchantTransactionId: true,
    amountPaise: true,
    providerPaymentId: true,
    providerStatus: true,
    providerSignature: true,
    createdAt: true,
  },
});

console.log("=== USER STATE ===");
console.log(JSON.stringify(user, null, 2));
console.log("\n=== PAYMENTS ===");
for (const p of payments) {
  console.log(`  ${p.merchantTransactionId} | status=${p.status} | ${p.amountPaise / 100} INR | provider=${p.providerPaymentId ?? "(none)"} | ${p.providerStatus ?? ""}`);
}
if (!payments.length) console.log("  (none)");

await prisma.$disconnect();
