// src/whois/whois.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { WhoisPresence } from '../schemas/whois.schema';
import { WhoisMessage } from '../schemas/whois-message.schema';
import { User } from '../schemas/user.schema'; // adjust path if needed

@Injectable()
export class WhoisService {
  //   constructor(@InjectModel(WhoisPresence.name) private readonly whoisModel: Model<WhoisPresence>) {}
  constructor(
    @InjectModel(WhoisPresence.name)
    private readonly whoisModel: Model<WhoisPresence>,
    @InjectModel(WhoisMessage.name)
    private readonly messageModel: Model<WhoisMessage>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async removePresence(userId: string) {
    return this.whoisModel.deleteMany({ userId });
  }

  async pingPresence(userId: string, data: Partial<WhoisPresence>) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours
    const normalizedCity = data.city?.trim().toLowerCase() || 'unknown';

    // Defensive: coerce coordinates to numbers if provided, otherwise drop invalid coords
    const payload: any = { ...data };
    // Debug: log incoming coordinates for diagnostics
    try {
      if (payload.coordinates) {
        console.debug('whois.pingPresence received coordinates:', JSON.stringify(payload.coordinates));
      } else {
        console.debug('whois.pingPresence received no coordinates for userId:', userId);
      }
    } catch (e) {
      // ignore logging errors
    }
    if (payload.coordinates) {
      try {
        const lat = Number((payload.coordinates as any).lat);
        const lng = Number((payload.coordinates as any).lng);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          payload.coordinates = { lat, lng };
        } else {
          delete payload.coordinates;
        }
      } catch (e) {
        delete payload.coordinates;
      }
    }

    return this.whoisModel.findOneAndUpdate(
      { userId },
      { ...payload, city: normalizedCity, expiresAt, visible: true },
      { upsert: true, new: true },
    );
  }

  async hidePresence(userId: string, visible:boolean) {

    return this.whoisModel.findOneAndUpdate({ userId }, { visible});
  }


  async getNearby(city: string, userId: any, lat?: string, lon?: string) {
    const query: any = {
      city,
      visible: true,
    };

    // Only include userId exclusion if it's a valid non-empty string
    if (userId && typeof userId === 'string' && userId.trim() !== '') {
      query.userId = { $ne: userId };
    }

    // Fetch all visible presences for the city
    const visibleUsers = await this.whoisModel.find(query).lean();

    // Defensive normalization: coerce any stored coordinates (strings) to numbers so distance can be computed
    visibleUsers.forEach((vu: any) => {
      if (vu && vu.coordinates) {
        try {
          const lat = Number((vu.coordinates as any).lat)
          const lng = Number((vu.coordinates as any).lng)
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            vu.coordinates = { lat, lng }
          } else {
            delete vu.coordinates
          }
        } catch (e) {
          delete vu.coordinates
        }
      }
    })

    // Collect all userIds that are present and valid
      // Normalize userIds to strings so we can query the users collection reliably.
      const userIds = visibleUsers
        .map((u) => {
          if (!u.userId) return null;
          if (typeof u.userId === 'string') return u.userId;
          if (typeof u.userId === 'object' && u.userId.toString) return u.userId.toString();
          return null;
        })
        .filter((id) => !!id);

    // Batch fetch all user details
    const userMap = new Map();
    if (userIds.length > 0) {
      const users = await this.userModel
          .find({ _id: { $in: userIds } })
          .select('_id username profileVisible avatar')
        .lean();
      users.forEach((u) => userMap.set(u._id.toString(), u));
    }

    // helper: compute haversine if lat/lon provided
    const toRadians = (value: number) => (value * Math.PI) / 180
    const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const earthRadiusKm = 6371
      const dLat = toRadians(lat2 - lat1)
      const dLng = toRadians(lng2 - lng1)
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return earthRadiusKm * c
    }

    const originLat = lat ? parseFloat(lat) : null
    const originLon = lon ? parseFloat(lon) : null

    // Build the response in one pass
    const results = visibleUsers.map((user) => {
      const base = {
        _id: user._id,
        city: user.city,
        status: user.status,
        coordinates: user.coordinates,
        lastSeen: user.expiresAt,
      } as any;

      // compute distance if possible
      if (originLat !== null && originLon !== null && user.coordinates && typeof user.coordinates.lat === 'number' && typeof user.coordinates.lng === 'number') {
        try {
          base.distanceKm = haversineKm(originLat, originLon, user.coordinates.lat, user.coordinates.lng)
        } catch (e) {
          // ignore errors computing distance
        }
      } else {
        base.distanceKm = null
      }

      // If the requestor is not logged in (no userId), return anonymous data
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return {
          ...base,
          anonymous: true,
        };
      }

      // Only attempt to find the user if a valid userId exists on the record
      if (!user.userId) {
        return {
          ...base,
          anonymous: true,
        };
      }

      const foundUser = userMap.get(user.userId.toString());
      if (!foundUser) {
        return {
          ...base,
          anonymous: true,
        };
      }

      if (foundUser.profileVisible === false) {
        return {
          ...base,
          userId: foundUser._id.toString(),
          anonymous: true,
        };
      }

      return {
        ...base,
        userId: foundUser._id.toString(),
        username: foundUser.username || 'User',
      };
    });

    // Debug: log a small sample so we can inspect coordinates/distance when troubleshooting
    try {
      // Limit output length to avoid noisy logs
      const sample = results.slice(0, 6).map(r => ({ _id: r._id?.toString?.() || r._id, userId: r.userId, distanceKm: r.distanceKm, coordinates: r.coordinates }));
      console.debug('whois.getNearby sample:', JSON.stringify(sample));
    } catch (e) {
      // ignore logging errors
    }

    return results;
  }
  

  async getChatHistory(currentUserId: string, peerUserId: string) {
    return this.messageModel
      .find({
        $or: [
          { from: currentUserId, to: peerUserId },
          { from: peerUserId, to: currentUserId },
        ],
      })
      .sort({ createdAt: 1 });
  }

  async markMessagesAsRead(fromUserId: string, toUserId: string) {
    return this.messageModel.updateMany(
      { from: fromUserId, to: toUserId, read: false },
      { $set: { read: true } },
    );
  }

  // --- NEW METHOD: Get Conversations for Inbox ---
  async getConversationsForUser(userId: string) {
    // Convert userId string to ObjectId for aggregation $match
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const conversations = await this.messageModel.aggregate([
      {
        $match: {
          $or: [{ fromUserId: userObjectId }, { toUserId: userObjectId }],
        },
      },
      {
        $sort: { createdAt: -1 }, // Sort by most recent message first
      },
      {
        $group: {
          _id: {
            // Group by a unique conversation identifier (sorted IDs)
            $cond: [
              { $gt: ['$fromUserId', '$toUserId'] }, // If fromUserId > toUserId (lexicographically)
              { user1: '$fromUserId', user2: '$toUserId' },
              { user1: '$toUserId', user2: '$fromUserId' },
            ],
          },
          lastMessage: { $first: '$$ROOT' }, // Get the entire last message document for each group
        },
      },
      {
        $replaceRoot: { newRoot: '$lastMessage' }, // Promote the last message to the root
      },
      {
        $sort: { createdAt: -1 }, // Sort again by createdAt for final display order (most recent conversations first)
      },
      {
        $lookup: {
          // Populate fromUserId with user details
          from: 'users', // Collection name for User schema (usually lowercase plural of schema name)
          localField: 'fromUserId',
          foreignField: '_id',
          as: 'fromUser',
        },
      },
      {
        $unwind: '$fromUser', // Deconstructs the fromUser array field from the input documents to output a document for each element.
      },
      {
        $lookup: {
          // Populate toUserId with user details
          from: 'users', // Collection name for User schema
          localField: 'toUserId',
          foreignField: '_id',
          as: 'toUser',
        },
      },
      {
        $unwind: '$toUser', // Deconstructs the toUser array field
      },
      {
        $project: {
          // Shape the output for the frontend
          _id: 1, // The message ID of the last message in the conversation
          message: 1, // Content of the last message
          createdAt: 1, // Timestamp of the last message
          read: 1, // Read status of the last message
          fromUserId: 1,
          toUserId: 1,
          otherUser: {
            // Details of the other participant in the conversation
            $cond: [
              { $eq: ['$fromUserId', userObjectId] }, // If fromUserId is current user (the one whose inbox we are fetching)
              {
                _id: '$toUser._id',
                username: '$toUser.username',
                avatar: '$toUser.avatar', // Assuming avatar exists in User schema
              },
              {
                _id: '$fromUser._id', // If toUserId is current user
                username: '$fromUser.username',
                avatar: '$fromUser.avatar', // Assuming avatar exists in User schema
              },
            ],
          },
        },
      },
    ]);

    return conversations;
  }

  async getMessagesBetweenUsers(userId1: string, userId2: string) {
    const messages = await this.messageModel
      .find({
        $or: [
          { fromUserId: userId1, toUserId: userId2 },
          { fromUserId: userId2, toUserId: userId1 },
        ],
      })
      .sort({ createdAt: 1 }) // Ascending order
      .lean(); // Return plain JavaScript objects

    // Populate usernames and avatars for frontend display
    const userIds = [userId1, userId2].map(
      (id) => new mongoose.Types.ObjectId(id),
    );
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('_id username avatar')
      .lean();
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return messages.map((msg) => ({
      ...msg,
      username:
        userMap.get(msg.fromUserId.toString())?.username || 'Unknown User',
      avatar:
        userMap.get(msg.fromUserId.toString())?.avatarUrl ||
        `https://i.pravatar.cc/40?u=${msg.fromUserId.toString()}`,
    }));
  }
}
