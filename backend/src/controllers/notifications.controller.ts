import { Controller, Get, Req, UseGuards, Patch, Body, Put } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { AuthGuard } from '../gateways/auth.guard';
import { Request } from 'express';

interface AuthRequest extends Request { user?: { id: string } }

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly svc: NotificationService) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    const userId = req.user!.id
    const items = await this.svc.getNotificationsForUser(userId)
    // map to client shape
    return items.map((it) => {
      const created = (it as any).createdAt
      return {
        fromUserId: (it.fromUserId as any)?.toString(),
        fromUsername: it.fromUsername,
        messagePreview: it.messagePreview,
        createdAt: created ? new Date(created).toISOString() : undefined,
        conversationId: it.conversationId,
        read: it.read,
      }
    })
  }

  @Put('mark-read')
  async markRead(@Req() req: AuthRequest, @Body() body: { fromUserId?: string; all?: boolean }) {
    const userId = req.user!.id
    if (body.all) {
      await this.svc.markAllRead(userId)
    } else if (body.fromUserId) {
      await this.svc.markReadFromUser(userId, body.fromUserId)
    }
    return { success: true }
  }
}
