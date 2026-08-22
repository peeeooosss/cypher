import { createClient } from "@prisma/client/runtime/library";

const { prisma } = createClient({ datasourceUrl: process.env.DATABASE_URL });

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
