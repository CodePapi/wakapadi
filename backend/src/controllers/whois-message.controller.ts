// src/whois/whois-message.controller.ts
import { Controller, Post, Get, Param, Body, Req, UseGuards, Query, Patch } from '@nestjs/common';
import { WhoisMessageService } from '../services/whois-message.service';
import { AuthGuard } from '../gateways/auth.guard';
import { Request } from 'express';
import { UsersService } from '../services/user.service';

interface AuthRequest extends Request {
  user?: { id: string };
}

@Controller('whois/chat')
@UseGuards(AuthGuard)
export class WhoisMessageController {
  constructor(private readonly messageService: WhoisMessageService,
    private readonly userService: UsersService
    ) {}

  @Get('inbox') // specific route
  async inbox(@Req() req: AuthRequest) {
    return this.messageService.getInbox(req.user!.id);
  }  
  @Post('send')
  async send(@Req() req: AuthRequest, @Body() body: { toUserId: string; message: string }) {
    // While messages are primarily sent via WebSocket for real-time,
    // this endpoint can serve as a fallback or for initial sends.
    return this.messageService.sendMessage(req.user!.id, body.toUserId, body.message);
  }
  @Get('unread-count')
  async unreadCount(@Req() req: AuthRequest) {
    // This endpoint also remains unchanged.
    const count = await this.messageService.getUnreadCount(req.user!.id);
    return { unreadCount: count };
  }
  @Patch('mark-read')
  async markMessagesRead(@Req() req: AuthRequest, @Body() body: { fromUserId: string; messageIds: string[] }) {
    await this.messageService.markMessagesAsRead(req.user!.id, body.fromUserId, body.messageIds);
    return { success: true };
  }
  @Get(':otherId')
  async getChat(
    @Req() req: AuthRequest,
    @Param('otherId') otherId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20'
  ) {
    // Fetch conversation between the authenticated user and the requested other user
    const currentUserId = req.user!.id
    const result = await this.messageService.getConversation(
      currentUserId,
      otherId,
      parseInt(page),
      parseInt(limit)
    );

    const otherUser = await this.userService.getPreferences(otherId)
    const blockStatus = await this.userService.isBlockedBetween(currentUserId, otherId)
    return {
      otherUser,
      messages: result.messages, // These messages will include 'reactions' and populated user info
      meta: {
        page: result.page,
        total: result.total,
        totalPages: result.totalPages,
        blockStatus,
      }
    };
  }







}