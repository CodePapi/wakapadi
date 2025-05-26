import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WhoisPresence } from '../schemas/whois.schema';
import { User } from '../schemas/user.schema';
import { PingPresenceDto, NearbyQueryDto } from '../types/whois.dto';

interface NearbyUserResult {
  id: Types.ObjectId;
  city: string;
  coordinates: { lat: number; lng: number };
  lastSeen: Date;
  anonymous?: boolean;
  user?: {
    username?: string;
    avatarUrl?: string;
    socials?: any;
  };
}

@Injectable()
export class WhoisService {
  constructor(
    @InjectModel(WhoisPresence.name) private readonly whoisModel: Model<WhoisPresence>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async getNearby(dto: NearbyQueryDto, requestUserId?: Types.ObjectId | string): Promise<NearbyUserResult[]> {
    const query: any = { 
      city: new RegExp(`^${dto.city}$`, 'i'),
      visible: true,
      lastSeen: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    };

    if (dto.radius && dto.coordinates) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [dto.coordinates.lng, dto.coordinates.lat],
          },
          $maxDistance: dto.radius * 1000,
        },
      };
    }

    const presences = await this.whoisModel.find(query).lean();

    return Promise.all(
      presences.map(async (presence): Promise<NearbyUserResult> => {
        // Convert FlattenMaps to regular objects
        const base = {
          id: new Types.ObjectId(presence._id.toString()),
          city: presence.city,
          coordinates: {
            lat: presence.coordinates.lat,
            lng: presence.coordinates.lng
          },
          lastSeen: presence.lastSeen,
        };

        if (!requestUserId) {
          return { ...base, anonymous: true };
        }

        const userId = typeof requestUserId === 'string' 
          ? new Types.ObjectId(requestUserId)
          : requestUserId;

        const user = await this.userModel.findById(presence.userId)
          .select('username avatarUrl socials')
          .lean();
console.log("nerby", user)
        return {
          ...base,
          user: {
            username: user?.username,
            avatarUrl: user?.avatarUrl,
            socials: user?.socials ? JSON.parse(JSON.stringify(user.socials)) : undefined,
          },
        };
      })
    );
  }


  // async pingPresence(userId: Types.ObjectId | string, dto: PingPresenceDto) {
  //   const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6h TTL
  //   const normalizedCity = dto.city?.trim().toLowerCase() || 'unknown';
  
    // Validate or convert userId
  //   let objectUserId: Types.ObjectId;
  //   try {
  //     objectUserId = new Types.ObjectId(userId); // throws if invalid
  //   } catch (err) {
  //     throw new Error(`Invalid userId passed to pingPresence: ${userId}`);
  //   }
  
  //   return this.whoisModel.findOneAndUpdate(
  //     { userId: objectUserId },
  //     {
  //       ...dto,
  //       city: normalizedCity,
  //       expiresAt,
  //       visible: true,
  //       lastSeen: new Date(),
  //     },
  //     { upsert: true, new: true }
  //   );
  // }
  
async pingPresence(userId: Types.ObjectId | string, dto: PingPresenceDto) {
    if (typeof userId === 'string' && !Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid userId format - must be a valid ObjectId');
    }

    const userIdObj = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const normalizedCity = dto.city?.trim().toLowerCase() || 'unknown';

    return this.whoisModel.findOneAndUpdate(
        { userId: userIdObj },
        {
            ...dto,
            city: normalizedCity,
            expiresAt,
            visible: true,
            lastSeen: new Date(),
        },
        { upsert: true, new: true }
    );
}

  async hidePresence(userId: Types.ObjectId) {
    return this.whoisModel.updateOne(
      { userId },
      { visible: false }
    );
  }
}