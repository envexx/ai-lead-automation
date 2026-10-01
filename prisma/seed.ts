import { seedDemoData } from "../src/core/seed";

seedDemoData({ reset: true })
  .then((result) => {
    console.log(`Seeded ${result.seeded} leads.`);
    for (const row of result.results) {
      console.log(`  ${row.status.padEnd(5)} ${String(row.score).padStart(3)}  ${row.lead}`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
