import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { OpportunitiesService } from './opportunities.service';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';
import { MoveOpportunityDto } from './dto/move-opportunity.dto';

@Controller('opportunities')
@UseGuards(AuthGuard)
export class OpportunitiesController {
  constructor(private readonly opportunities: OpportunitiesService) {}

  @Get()
  list(@Req() req: Request) {
    const { companyId } = req.user!;
    return this.opportunities.list(companyId);
  }

  @Post()
  async create(@Req() req: Request, @Body() dto: CreateOpportunityDto) {
    const { companyId } = req.user!;
    const opportunity = await this.opportunities.create(companyId, dto);
    if (!opportunity) throw new NotFoundException('Customer not found');
    return opportunity;
  }

  @Get(':id')
  async getById(@Req() req: Request, @Param('id') id: string) {
    const { companyId } = req.user!;
    const opportunity = await this.opportunities.findById(companyId, id);
    if (!opportunity) throw new NotFoundException('Opportunity not found');
    return opportunity;
  }

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    const { companyId } = req.user!;
    const existing = await this.opportunities.findById(companyId, id);
    if (!existing) throw new NotFoundException('Opportunity not found');

    // If customerId is being changed, ensure it belongs to tenant.
    if (dto.customerId && dto.customerId !== existing.customerId) {
      const ok = await this.opportunities.customerExists(companyId, dto.customerId);
      if (!ok) throw new NotFoundException('Customer not found');
    }

    return this.opportunities.updateById(companyId, id, dto);
  }

  @Post(':id/move')
  async move(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: MoveOpportunityDto,
  ) {
    const { companyId, userId } = req.user!;
    const updated = await this.opportunities.moveStage({
      companyId,
      opportunityId: id,
      toStage: dto.toStage,
      changedByUserId: userId,
    });
    if (!updated) throw new NotFoundException('Opportunity not found');
    return updated;
  }

  @Get(':id/history')
  async history(@Req() req: Request, @Param('id') id: string) {
    const { companyId } = req.user!;
    const existing = await this.opportunities.findById(companyId, id);
    if (!existing) throw new NotFoundException('Opportunity not found');
    return this.opportunities.listHistory(companyId, id);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const { companyId } = req.user!;
    const existing = await this.opportunities.findById(companyId, id);
    if (!existing) throw new NotFoundException('Opportunity not found');
    await this.opportunities.deleteById(companyId, id);
    return { ok: true };
  }
}
