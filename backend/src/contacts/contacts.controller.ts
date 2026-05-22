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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller()
@UseGuards(AuthGuard)
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get('customers/:customerId/contacts')
  async listForCustomer(
    @Req() req: Request,
    @Param('customerId') customerId: string,
  ) {
    const { companyId } = req.user!;
    const contacts = await this.contacts.listForCustomer(companyId, customerId);
    if (!contacts) throw new NotFoundException('Customer not found');
    return contacts;
  }

  @Post('customers/:customerId/contacts')
  async createForCustomer(
    @Req() req: Request,
    @Param('customerId') customerId: string,
    @Body() dto: CreateContactDto,
  ) {
    const { companyId } = req.user!;
    const contact = await this.contacts.createForCustomer(
      companyId,
      customerId,
      dto,
    );
    if (!contact) throw new NotFoundException('Customer not found');
    return contact;
  }

  @Get('contacts/:id')
  async getById(@Req() req: Request, @Param('id') id: string) {
    const { companyId } = req.user!;
    const contact = await this.contacts.findById(companyId, id);
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  @Patch('contacts/:id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    const { companyId } = req.user!;
    const existing = await this.contacts.findById(companyId, id);
    if (!existing) throw new NotFoundException('Contact not found');
    return this.contacts.updateById(companyId, id, dto);
  }

  @Delete('contacts/:id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    const { companyId } = req.user!;
    const existing = await this.contacts.findById(companyId, id);
    if (!existing) throw new NotFoundException('Contact not found');
    await this.contacts.deleteById(companyId, id);
    return { ok: true };
  }
}
