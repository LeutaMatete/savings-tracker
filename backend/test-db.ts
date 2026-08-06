import { PrismaClient } from "./src/generated/prisma/client.js";

const prisma = new PrismaClient();

async function main() {
  console.log("✅ Connected to database!");
  const userCount = await prisma.user.count();
  console.log(`📊 Users in database: ${userCount}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
