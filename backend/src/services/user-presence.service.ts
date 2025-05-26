import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { WhoisPresence } from '../schemas/whois.schema';
import { RedisService } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { WhoisService } from './whois.service';

@Injectable()
export class UserPresenceService {
  private readonly redisClient: Redis;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(WhoisPresence.name) private readonly presenceModel: Model<WhoisPresence>,
    @Inject(forwardRef(() => WhoisService))
    private readonly whoisService: WhoisService,
    // private readonly redisService: RedisService,
  ) {
    // this.redisClient = this.redisService.getClient();
  }

  async updateUserPresence(userId: string, isOnline: boolean) {
    // Update MongoDB
    await this.userModel.updateOne(
      { _id: userId },
      { isOnline, lastActive: new Date() }
    );

    // Update Redis with TTL
    const key = `user:presence:${userId}`;
    if (isOnline) {
      await this.redisClient.set(key, 'online', 'EX', 60 * 15); // 15min TTL
    } else {
      await this.redisClient.del(key);
    }
  }

  async getActiveUsersInCity(city: string): Promise<{
    online: string[];
    recentlyActive: string[];
  }> {
    // Get real-time online users from Redis
    const onlineUserIds = await this.getRedisOnlineUsers();

    // Get DB users with fallback
    const [recentlyActiveUsers] = await Promise.all([
      this.presenceModel.find({
        city: new RegExp(`^${city}$`, 'i'),
        lastSeen: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }).select('userId'),
    ]);

    return {
      online: onlineUserIds,
      recentlyActive: recentlyActiveUsers.map(u => u.userId.toString()),
    };
  }

  private async getRedisOnlineUsers(): Promise<string[]> {
    const keys = await this.redisClient.keys('user:presence:*');
    return keys.map(key => key.split(':')[2]);
  }
}