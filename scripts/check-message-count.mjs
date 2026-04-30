import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const expected = Number(process.argv[2] ?? 180);

try {
  const total = await prisma.message.count();
  const byGroup = await prisma.message.groupBy({
    by: ["groupId"],
    _count: { _all: true },
    orderBy: { _count: { groupId: "desc" } },
  });

  console.log(`Message count: ${total}`);
  console.log(`Expected: ${expected}`);
  console.log(total === expected ? "OK: count matches" : "Mismatch: count does not match");

  console.log("\nCount by groupId:");
  for (const row of byGroup) {
    console.log(`${row.groupId ?? "(null)"}: ${row._count._all}`);
  }

  if (total !== expected) {
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
