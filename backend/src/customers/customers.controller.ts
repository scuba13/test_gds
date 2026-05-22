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
import type { RequestUser } from '../common/types/request-user';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@Req() req: Request) {
    const { companyId } = (req as any).user as RequestUser;
    return this.customers.list(companyId);
  }

  @Post()
  create(@Req() req: Request, @Body() dto: CreateCustomerDto) {
    const { companyId } = (req as any).user as RequestUser;
    return this.customers.create(companyId, dto);
  }

  @Get(':id')
  async getById(@Req() req: Request, @Param('id') id: string) {
    const { companyId } = (req as any).user as RequestUser;
    const customer = await this.customers.findById(companyId, id);
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const { companyId } = (req as any).user as RequestUser;
    const existing = await this.customers.findById(companyId, id);
    if (!existing) throw new NotFoundException('Customer not found');
    return this.customers.updateById(companyId, id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const { companyId } = (req as any).user as RequestUser;
    const existing = await this.customers.findById(companyId, id);
    if (!existing) throw new NotFoundException('Customer not found');
    await this.customers.deleteById(companyId, id);
    return { ok: true };
  }
}
