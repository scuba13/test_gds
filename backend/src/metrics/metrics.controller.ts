import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { MetricsService } from './metrics.service';

@Controller('metrics')
@UseGuards(AuthGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('summary')
  summary(@Req() req: Request) {
    const { companyId } = req.user!;
    return this.metrics.summary(companyId);
  }
}
