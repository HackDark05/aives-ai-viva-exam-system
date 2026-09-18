import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_USERS = [
  {
    email: 'ivan.p@example.net',
    name: 'Alex Rivera',
    role: Role.STUDENT,
  },
  {
    email: 'priya.s@example.net',
    name: 'Priya Shah',
    role: Role.EXAMINER,
  },
  {
    email: 'jordan.h@example.net',
    name: 'Jordan Hale',
    role: Role.ADMIN,
  },
] as const;

async function main() {
  const password = await bcrypt.hash(
    process.env.DEMO_PASSWORD ?? 'demo1234',
    10,
  );

  for (const demo of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: demo.email },
      update: {},
      create: {
        email: demo.email,
        password,
        name: demo.name,
        role: demo.role,
      },
    });
  }
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
