// src/whois/whois.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Req,
  UseGuards,
  Query,
  Param,
  BadRequestException,
  HttpException,
  HttpStatus,
  Patch,
} from '@nestjs/common';
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

  @Patch()
  @UseGuards(AuthGuard)
  async hide(@Body() body, @Req() req: AuthRequest) {
    return this.whoisService.hidePresence(req.user!.id, body.visible);
  }

  @Get('nearby')
  async nearby(@Req() req: AuthRequest) {
    const city = (req.query.city as string) || '';
    const lat = req.query.lat as string | undefined;
    const lon = req.query.lon as string | undefined;
    const page = parseInt((req.query.page as string) || '1', 10) || 1;
    const limit = parseInt((req.query.limit as string) || '15', 10) || 15;
    // Prefer authenticated user id from request (AuthGuard) when available
    const authUserId = req.user?.id as string | undefined;
    const queryUserId = req.query.userId as string | undefined;
    const effectiveUserId = authUserId && authUserId.trim() !== '' ? authUserId : queryUserId;
    return this.whoisService.getNearby(city, effectiveUserId, lat, lon, page, limit);
  }

  @UseGuards(AuthGuard)
  @Get('chat/:userId')
  async getChat(@Param('userId') userId: string, @Req() req: AuthRequest) {
    return this.whoisService.getChatHistory(req.user!.id, userId);
  }

  // Public: remove a user's stored presence
  @Delete(':userId')
  async removePresence(@Param('userId') userId: string) {
    return this.whoisService.removePresence(userId)
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
    @Query('limit') limit = '20',
  ) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('Invalid user ID');
      }
      return await this.messageService.getConversation(
        req.user!.id,
        userId,
        parseInt(page),
        parseInt(limit),
      );
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.BAD_REQUEST);
    }
  }
}
