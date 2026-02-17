// src/contact/contact.controller.ts
import { Body, Controller, Get, Post, Query, UseGuards, Param, Patch } from '@nestjs/common';
import { ContactService } from '../services/contact.service';
import { AuthGuard } from '../gateways/auth.guard';
import { UpdateContactDto } from '../types/update-contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async createMessage(@Body() dto: any) {
    return this.contactService.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard)
  async getMessages(@Query('page') page?: string, @Query('limit') limit?: string) {
    const parsedPage = page ? Number(page) : 1;
    const parsedLimit = limit ? Number(limit) : 20;
    return this.contactService.findPaginated(parsedPage, parsedLimit);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateMessage(@Param('id') id: string, @Body() body: UpdateContactDto) {
    return this.contactService.update(id, body);
  }

  @Post(':id/attend')
  @UseGuards(AuthGuard)
  async attend(@Param('id') id: string, @Body() body: { attendedBy?: string; note?: string }) {
    return this.contactService.markAttended(id, body?.attendedBy, body?.note);
  }

  @Post(':id/unattend')
  @UseGuards(AuthGuard)
  async unattend(@Param('id') id: string) {
    return this.contactService.markUnattended(id);
  }
}
