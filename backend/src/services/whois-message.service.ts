import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WhoisMessage } from '../schemas/whois-message.schema';
import { WhoisGateway } from '../gateways/whois.gateway';
import { SendMessageDto, GetThreadQueryDto } from '../types/message.dto';
import { WhoisMessageDocument } from 'src/types/mongoose.types';
import { UserPresenceService } from './user-presence.service';

@Injectable()
export class WhoisMessageService {
  constructor(
    // @InjectModel(WhoisMessage.name) private readonly messageModel: Model<WhoisMessage>,
    @InjectModel(WhoisMessage.name) 
    private readonly messageModel: Model<WhoisMessageDocument>,
    private readonly gateway: WhoisGateway,
    @Inject(forwardRef(() => UserPresenceService))
    private readonly userPresenceService: UserPresenceService,
  ) {}

  async sendMessage(dto: SendMessageDto) {
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h TTL
    
    const message = await this.messageModel.create({
      fromUserId: dto.fromUserId,
      toUserId: new Types.ObjectId(dto.toUserId),
      message: dto.message,
      expiresAt,
    });

    this.gateway.emitToUser(dto.toUserId, 'message:new', {
      id: message._id,
      fromUserId: dto.fromUserId,
      message: dto.message,
      sentAt: message.createdAt,
    });

    return message;
  }

  async getConversation(dto: GetThreadQueryDto) {
    const [messages, total] = await Promise.all([
      this.messageModel
        .find({
          $or: [
            { fromUserId: dto.userId, toUserId: dto.targetUserId },
            { fromUserId: dto.targetUserId, toUserId: dto.userId },
          ],
          expiresAt: { $gt: new Date() },
        })
        .sort({ createdAt: -1 })
        .skip((dto.page - 1) * dto.limit)
        .limit(dto.limit),
      
      this.messageModel.countDocuments({
        $or: [
          { fromUserId: dto.userId, toUserId: dto.targetUserId },
          { fromUserId: dto.targetUserId, toUserId: dto.userId },
        ],
      }),
    ]);

    if (messages.length > 0) {
      await this.markMessagesAsRead(
        new Types.ObjectId(dto.targetUserId), 
        new Types.ObjectId(dto.userId)
      );
        }

    return {
      data: messages.reverse(), // Oldest first
      meta: {
        page: dto.page,
        limit: dto.limit,
        total,
        totalPages: Math.ceil(total / dto.limit),
      },
    };
  }

  async markMessagesAsRead(fromUserId: string | Types.ObjectId, toUserId: string | Types.ObjectId) {
    const filter = {
      fromUserId: new Types.ObjectId(fromUserId),
      toUserId: new Types.ObjectId(toUserId),
      read: false
    };
    
    await this.messageModel.updateMany(filter, { $set: { read: true } });

////
    this.gateway.emitToUser(
      fromUserId.toString(), 
      'messages:read', 
      { byUserId: toUserId.toString() }
    );

    
  }

 
  
// Add this method to the service:
async clearThread(userId: string, targetUserId: string) {
  await this.messageModel.deleteMany({
    $or: [
      { fromUserId: userId, toUserId: targetUserId },
      { fromUserId: targetUserId, toUserId: userId }
    ]
  });
  return { success: true };
}

// Update getUnreadCount method:
async getUnreadCount(userId: string) {
  return this.messageModel.countDocuments({ 
    toUserId: userId, 
    read: false,
    expiresAt: { $gt: new Date() }
  });
}

  // Example usage in WhoisService
async getEnhancedNearby(city: string) {
  const { online, recentlyActive } = await this.userPresenceService.getActiveUsersInCity(city);
  
  return {
    online, // Real-time online users
    travellers: recentlyActive, // Recently active users
    // ... existing whois data
  };
}
async getCityActivity(city: string) {
  return this.userPresenceService.getActiveUsersInCity(city);
}
}