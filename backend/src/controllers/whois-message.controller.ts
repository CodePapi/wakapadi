import { Controller, Post, Get, Delete, Body, Req, Param, Query, UseGuards } from '@nestjs/common';
import { WhoisMessageService } from '../services/whois-message.service';
import { AuthGuard } from '../gateways/auth.guard';
import { ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { SendMessageDto, GetThreadQueryDto } from 'src/types/message.dto';

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('whois/chat')
export class WhoisMessageController {
  constructor(private readonly messageService: WhoisMessageService) {}

  @Post('send')
  async send(@Body() dto: SendMessageDto, @Req() req) {
    return this.messageService.sendMessage({
      ...dto,
      fromUserId: req.user.sub // Now matches DTO
    });
  }
  
  @Get('thread/:userId')
  async getThread(
    @Param('userId') targetUserId: string,
    @Query() query: GetThreadQueryDto,
    @Req() req
  ) {
    return this.messageService.getConversation({
      ...query,
      userId: req.user.sub,
      targetUserId
    });
  }

  @Delete('thread/:userId')
  @ApiParam({ name: 'userId', required: true })
  @ApiResponse({ status: 200, description: 'Thread cleared successfully' })
  async clearThread(@Param('userId') userId: string, @Req() req) {
    console.log("delete")
    return this.messageService.clearThread(req.user.sub, userId);
  }

  @Get('unread-count')
  @ApiResponse({ status: 200, description: 'Returns unread message count' })
  async unreadCount(@Req() req) {
    return { 
      count: await this.messageService.getUnreadCount(req.user.sub) 
    };
  }
}