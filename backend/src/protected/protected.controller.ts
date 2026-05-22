import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';

@Controller('protected')
@UseGuards(AuthGuard)
export class ProtectedController {
  @Get('ping')
  ping(@Req() req: Request) {
    const { userId, companyId } = req.user!;
    return {
      ok: true,
      userId,
      companyId,
    };
  }
}
