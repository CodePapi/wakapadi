// src/whois/whois.controller.ts
import { Controller, Get, Post, Delete, Body, Req, UseGuards, Query, Param, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { WhoisService } from '../services/whois.service';
import { AuthGuard } from '../gateways/auth.guard';
import { Request } from 'express';
import mongoose from 'mongoose';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('whois')
export class WhoisController {
  messageService: any;
  constructor(private readonly whoisService: WhoisService) {}

  @Post('ping')
  @UseGuards(AuthGuard)
  async ping(@Body() body, @Req() req: AuthRequest) {
    return this.whoisService.pingPresence(req.user!.id, body);
  }

  @Delete()
  @UseGuards(AuthGuard)
  async hide(@Req() req: AuthRequest) {
    return this.whoisService.hidePresence(req.user!.id);
  }

  @Get('nearby')
async nearby(@Req() req: AuthRequest) {
  const city = req.query.city as string;
  const userId = req.query.userId as string
  return this.whoisService.getNearby(city,  userId);
}


  
  @UseGuards(AuthGuard)
  @Get('chat/:userId')
  async getChat(@Param('userId') userId: string, @Req() req: AuthRequest) {
    return this.whoisService.getChatHistory(req.user!.id, userId);
  }
  
  @UseGuards(AuthGuard)
  @Post('chat/:userId/read')
  async markAsRead(@Param('userId') userId: string, @Req() req: AuthRequest) {
    return this.whoisService.markMessagesAsRead(userId, req.user!.id);
  }

  @Get('thread/:userId')
async getThread(
  @Req() req: AuthRequest,
  @Param('userId') userId: string,
  @Query('page') page = '1',
  @Query('limit') limit = '20'
) {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    return await this.messageService.getConversation(
      req.user!.id, 
      userId, 
      parseInt(page), 
      parseInt(limit)
    );
  } catch (err) {
    throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
  }
}
  
}


