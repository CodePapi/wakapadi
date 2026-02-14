// src/services/whois-message.service.ts
import { Injectable, OnModuleInit, NotFoundException, Inject, forwardRef } from '@nestjs/common'; // Add Inject, forwardRef
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { WhoisMessage } from '../schemas/whois-message.schema';
import { WhoisGateway } from '../gateways/whois.gateway';
import { User } from '../schemas/user.schema'; // Correct import for User schema

// --- REVISED INTERFACE ---
interface PopulatedMessageLean {
  _id: Types.ObjectId;
  fromUserId: { _id: Types.ObjectId; username: string; avatarUrl?: string };
  toUserId: { _id: Types.ObjectId; username: string; avatarUrl?: string };
  message: string;
  read: boolean;
  createdAt: Date;
  reactions: Array<{ emoji: string; fromUserId: Types.ObjectId }>;
  updatedAt?: Date;
}
// --- END REVISED INTERFACE ---


@Injectable()
export class WhoisMessageService implements OnModuleInit {
  constructor(
    @InjectModel(WhoisMessage.name)
    private readonly messageModel: Model<WhoisMessage>,
    @Inject(forwardRef(() => WhoisGateway)) // <--- Apply forwardRef here
    private readonly gateway: WhoisGateway,
    @InjectModel(User.name) private readonly userModel: Model<User> 
  ) {}

  onModuleInit() {}

  async sendMessage(fromUserId: string, toUserId: string, message: string) {
    const newMessage = await this.messageModel.create({ fromUserId, toUserId, message });
  
    const populatedMessage = (await this.messageModel.findById(newMessage._id)
      .populate('fromUserId', 'username avatarUrl')
      .populate('toUserId', 'username avatarUrl')
      .lean()) as PopulatedMessageLean | null;
  
    if (!populatedMessage) {
      console.error('Failed to populate message after creation. Message ID:', newMessage._id);
      throw new NotFoundException('Message not found after creation and population.');
    }
  
    const commonMessagePayload = {
      _id: populatedMessage._id.toString(),
      fromUserId: populatedMessage.fromUserId._id.toString(),
      toUserId: populatedMessage.toUserId._id.toString(),
      message: populatedMessage.message,
      createdAt: populatedMessage.createdAt.toISOString(),
      read: populatedMessage.read,
      username: populatedMessage.fromUserId.username,
      avatar: populatedMessage.fromUserId.avatarUrl || 'default_avatar.jpg',
      reactions: (populatedMessage.reactions || []).map((r: any) => ({ emoji: r.emoji, fromUserId: String(r.fromUserId) })),
    };
  
    // Only emit to the conversation room, not directly to users
    const roomName = [fromUserId, toUserId].sort().join('-');
    this.gateway.server.to(roomName).emit('message:new', commonMessagePayload);
  
    // Still send notification separately if needed
    this.gateway.emitToUser(toUserId, 'notification:new', {
      type: 'chat',
      from: fromUserId,
      text: message,
      timestamp: Date.now(),
    });
  
    return newMessage;
  }

  async addReaction(messageId: string, fromUserId: string, emoji: string) {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found.`);
    }

    const existingReactionIndex = message.reactions.findIndex(r => r.fromUserId.toString() === fromUserId);

    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ emoji, fromUserId: new Types.ObjectId(fromUserId) });
    }

    await message.save();

    const targetUser = message.fromUserId.toString() === fromUserId ? message.toUserId.toString() : message.fromUserId.toString();
    this.gateway.emitToUser(targetUser, 'message:reaction', { messageId, reaction: { emoji, fromUserId } });
    this.gateway.emitToUser(fromUserId, 'message:reaction', { messageId, reaction: { emoji, fromUserId } });

    return message;
  }

  async getConversation(userId: string, otherUserId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const filter = {
      $or: [
        { fromUserId: userId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: userId },
      ],
    };
 
    const [messages, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .populate('fromUserId', 'username avatarUrl')
        .populate('toUserId', 'username avatarUrl')
        .lean<PopulatedMessageLean[]>(),
      this.messageModel.countDocuments(filter),
    ]);

    await this.messageModel.updateMany(
      { fromUserId: otherUserId, toUserId: userId, read: false },
      { $set: { read: true } }
    );

    const readMessageIds = messages
      .filter(
        (msg) =>
          msg.fromUserId?._id &&
          msg.toUserId?._id &&
          msg.fromUserId._id.toString() === otherUserId &&
          msg.toUserId._id.toString() === userId &&
          msg.read === false
      )
      .map((msg) => msg._id.toString());

    if (readMessageIds.length > 0) {
      this.gateway.emitToUser(otherUserId, 'message:read:confirm', { messageIds: readMessageIds });
    }

    const safeMessages = messages.filter(
      (msg) => msg.fromUserId?._id && msg.toUserId?._id
    );

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      messages: safeMessages.map((msg) => ({
        _id: msg._id.toString(),
        message: msg.message,
        fromUserId: msg.fromUserId._id.toString(),
        toUserId: msg.toUserId._id.toString(),
        createdAt: msg.createdAt.toISOString(),
        read: msg.toUserId._id.toString() === userId ? true : msg.read,
        username: msg.fromUserId.username,
        avatar: msg.fromUserId.avatarUrl || 'default_avatar.jpg',
        reactions: (msg.reactions || []).map((r: any) => ({ emoji: r.emoji, fromUserId: String(r.fromUserId) })),
      })),
    };
  }

  async getInbox(userId: string) {
    const msg = await this.messageModel.aggregate([
      {
        $match: {
          $or: [
            { fromUserId: new Types.ObjectId(userId) },
            { toUserId: new Types.ObjectId(userId) }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$fromUserId', new Types.ObjectId(userId)] },
              '$toUserId',
              '$fromUserId'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',        // this is the "other" user's _id
          foreignField: '_id',
          as: 'otherUser'
        }
      },
      { $unwind: '$otherUser' },
      {
        $project: {
          _id: 0,
          message: '$lastMessage',
          otherUser: {
            _id: '$otherUser._id',
            username: '$otherUser.username',
            avatarUrl: '$otherUser.avatarUrl',
            email: '$otherUser.email', // add more fields as needed
          }
        }
      },
      { $sort: { 'message.createdAt': -1 } }
    ]);
    
    console.log("inbox userid", userId, "msg", msg)

    return msg
  }
  async getUserById(userId: string) {
    return this.userModel.findById(userId).select('_id username avatar').lean();
}
  async getUnreadCount(userId: string) {
    return this.messageModel.countDocuments({ toUserId: userId, read: false });
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
  async markMessagesAsRead(toUserId: string, fromUserId: string, messageIds: string[]) {
    await this.messageModel.updateMany(
      {
        _id: { $in: messageIds.map(id => new mongoose.Types.ObjectId(id)) },
        toUserId: new mongoose.Types.ObjectId(toUserId),
        fromUserId: new mongoose.Types.ObjectId(fromUserId),
        read: false,
      },
      { $set: { read: true } }
    );
  
    // Emit real-time read confirmation
    this.gateway.emitToUser(fromUserId, 'message:read:confirm', {
      readerId: toUserId,
      messageIds,
    });
  }
  
  // --- Existing Method: Get Messages Between Two Users ---
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

  // --- NEW/UPDATED METHOD: Create/Save a new message ---
  // async sendMessage(fromUserId: string, toUserId: string, messageContent: string): Promise<WhoisMessage> {
  //     const newMessage = await this.messageModel.create({
  //         fromUserId: new mongoose.Types.ObjectId(fromUserId),
  //         toUserId: new mongoose.Types.ObjectId(toUserId),
  //         message: messageContent,
  //         read: false,
  //         reactions: [],
  //         createdAt: new Date(), // Set createdAt to now
  //     });
  //     return newMessage;
  // }

  // --- NEW/UPDATED METHOD: Get a user by ID ---
  // async getUserById(userId: string) {
  //     return this.userModel.findById(userId).select('_id username avatar').lean();
  // }

  // --- NEW/UPDATED METHOD: Add a reaction to a message ---
  // async addReaction(messageId: string, fromUserId: string, emoji: string): Promise<WhoisMessage | null> {
  //     const message = await this.messageModel.findById(messageId);
  //     if (!message) {
  //         console.error('Message not found for reaction:', messageId);
  //         return null;
  //     }

  //     const fromObjectId = new mongoose.Types.ObjectId(fromUserId);

  //     const existingReactionIndex = message.reactions.findIndex(
  //         (r: any) => r.fromUserId.equals(fromObjectId)
  //     );

  //     if (existingReactionIndex > -1) {
  //         message.reactions[existingReactionIndex].emoji = emoji;
  //     } else {
  //         message.reactions.push({ fromUserId: fromObjectId, emoji: emoji });
  //     }

  //     await message.save();
  //     return message;
  // }
}
