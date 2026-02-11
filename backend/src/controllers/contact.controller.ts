// src/contact/contact.controller.ts
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ContactService } from '../services/contact.service';
import { AuthGuard } from '../gateways/auth.guard';

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
}
