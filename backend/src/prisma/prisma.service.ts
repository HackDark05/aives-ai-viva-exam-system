import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

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

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureDemoUsers();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async ensureDemoUsers() {
    const password = await bcrypt.hash(
      process.env.DEMO_PASSWORD ?? 'demo1234',
      10,
    );

    for (const demo of DEMO_USERS) {
      const existing = await this.user.findUnique({
        where: { email: demo.email },
      });
      if (existing) {
        continue;
      }

      await this.user.create({
        data: {
          email: demo.email,
          password,
          name: demo.name,
          role: demo.role,
        },
      });
      this.logger.log(`Seeded ${demo.role.toLowerCase()} ${demo.email}`);
    }
  }
}
