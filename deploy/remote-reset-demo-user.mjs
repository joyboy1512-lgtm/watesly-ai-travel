import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.user.findMany({
    select: { email: true, status: true, name: true },
  });
  console.log("USERS_BEFORE", JSON.stringify(before, null, 2));

  const passwordHash = await bcrypt.hash("Demo1234!", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@watesly.travel" },
    update: {
      passwordHash,
      status: "active",
      name: "مالك تجريبي",
    },
    create: {
      email: "demo@watesly.travel",
      passwordHash,
      status: "active",
      name: "مالك تجريبي",
    },
  });

  console.log("RESET_OK", user.email, user.status);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
