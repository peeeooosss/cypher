import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL must be configured");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);

  const stale = await prisma.payment.findMany({
    where: { provider: "PAYU", status: "PENDING", createdAt: { lt: staleThreshold } },
    select: { id: true, payerId: true, type: true, createdAt: true },
  });

  if (stale.length === 0) {
    console.log("No stale PENDING payments found.");
    return;
  }

  console.log(`Found ${stale.length} stale PENDING payment(s):`);
  for (const p of stale) {
    console.log(`  ${p.id} | type=${p.type} | payer=${p.payerId} | created=${p.createdAt.toISOString()}`);
  }

  const result = await prisma.payment.updateMany({
    where: { provider: "PAYU", status: "PENDING", createdAt: { lt: staleThreshold } },
    data: { status: "FAILED", providerStatus: "abandoned", metadata: { processingError: "Abandoned — cleared for retry" } },
  });

  console.log(`\nMarked ${result.count} payment(s) as FAILED.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
