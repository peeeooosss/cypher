const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();
async function main() {
  await prisma.scoringConfig.upsert({
    where: { name: "Dance Competition - Standard (4 Criteria)" },
    update: {},
    create: {
      name: "Dance Competition - Standard (4 Criteria)",
      description: "Standard 4-criteria scoring for dance competitions",
      appliesTo: "EVENT_TYPE",
      appliesToValue: "DANCE_COMPETITION",
      criteria: [
        { key: "musicality", label: "Musicality", max: 5, order: 1 },
        { key: "foundation", label: "Foundation", max: 5, order: 2 },
        { key: "presentation", label: "Presentation", max: 5, order: 3 },
        { key: "execution", label: "Execution", max: 5, order: 4 },
      ],
      totalMax: 20,
      isDefault: true,
      isActive: true,
    },
  });
}
main().then(() => prisma.$disconnect()).catch(e=>{console.error(e);process.exit(1)});
