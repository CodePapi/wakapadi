// src/whois/whois.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { WhoisPresence } from '../schemas/whois.schema';
import { WhoisMessage } from '../schemas/whois-message.schema';
import { User } from '../schemas/user.schema'; // adjust path if needed

@Injectable()
export class WhoisService {
//   constructor(@InjectModel(WhoisPresence.name) private readonly whoisModel: Model<WhoisPresence>) {}
  constructor(
    @InjectModel(WhoisPresence.name) private readonly whoisModel: Model<WhoisPresence>,
    @InjectModel(WhoisMessage.name) private readonly messageModel: Model<WhoisMessage>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}
  
  async pingPresence(userId: string, data: Partial<WhoisPresence>) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours
    const normalizedCity = data.city?.trim().toLowerCase() || 'unknown';

    return this.whoisModel.findOneAndUpdate(
      { userId },
      { ...data, city: normalizedCity, expiresAt, visible: true },
      { upsert: true, new: true }
    );
  }

  async hidePresence(userId: string) {
    return this.whoisModel.findOneAndUpdate({ userId }, { visible: false });
  }

  async getNearby(city: string, isAuthenticated?: boolean) {
    const visibleUsers = await this.whoisModel.find({ city, visible: true });
    console.log("visibleUsers", visibleUsers)
    console.log("city", city)


    return Promise.all(
      visibleUsers.map(async (user) => {
        const base = {
          _id: user._id,
          city: user.city,
            status: user.status,
            coordinates: user.coordinates,
            lastSeen: user.expiresAt, // or user.updatedAt or a new `lastPingedAt` field
          
        };
  
        // if (!isAuthenticated) {
        //   return {
        //     ...base,
        //     anonymous: true,
        //   };
        // }
  
        const foundUser = await this.userModel.findById(user.userId).lean();
  
        return {
          ...base,
          userId: foundUser?._id.toString(),
          username: foundUser?.username || 'User',
        };
      })
    );
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
      { $set: { read: true } }
    );
  }
  
  



  // --- NEW METHOD: Get Conversations for Inbox ---
  async getConversationsForUser(userId: string) {
    // Convert userId string to ObjectId for aggregation $match
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const conversations = await this.messageModel.aggregate([
      {
        $match: {
          $or: [
            { fromUserId: userObjectId },
            { toUserId: userObjectId },
          ],
        },
      },
      {
        $sort: { createdAt: -1 }, // Sort by most recent message first
      },
      {
        $group: {
          _id: { // Group by a unique conversation identifier (sorted IDs)
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
        $lookup: { // Populate fromUserId with user details
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
        $lookup: { // Populate toUserId with user details
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
        $project: { // Shape the output for the frontend
          _id: 1, // The message ID of the last message in the conversation
          message: 1, // Content of the last message
          createdAt: 1, // Timestamp of the last message
          read: 1, // Read status of the last message
          fromUserId: 1,
          toUserId: 1,
          otherUser: { // Details of the other participant in the conversation
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
    const userIds = [userId1, userId2].map(id => new mongoose.Types.ObjectId(id));
    const users = await this.userModel.find({ _id: { $in: userIds } }).select('_id username avatar').lean();
    const userMap = new Map(users.map(u => [u._id.toString(), u]));

    return messages.map(msg => ({
      ...msg,
      username: userMap.get(msg.fromUserId.toString())?.username || 'Unknown User',
      avatar: userMap.get(msg.fromUserId.toString())?.avatarUrl || `https://i.pravatar.cc/40?u=${msg.fromUserId.toString()}`,
    }));
  }
}
