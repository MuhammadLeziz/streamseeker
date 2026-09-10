import { Controller, Get } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface IHealthResponse {
  readonly status: 'ok' | 'degraded';
  readonly database: 'up' | 'down';
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reports on the database too, not just on the process. A container that
   * answers while its database is unreachable is not healthy, and an
   * orchestrator restarting it is the right outcome.
   */
  @Get()
  async check(): Promise<IHealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      return { status: 'degraded', database: 'down' };
    }
  }
}
