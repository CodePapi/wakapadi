// src/gateways/whois.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import {
  Inject,
  forwardRef,
} from "@nestjs/common";
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { WhoisMessage } from '../schemas/whois-message.schema';
import { WhoisMessageService } from '../services/whois-message.service'; // Import the service
import { NotificationService } from '../services/notification.service';
import { User } from '../schemas/user.schema'; // <--- Import User schema for getUserById

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

@WebSocketGateway({
  cors: {
    origin: '*', // Adjust for your frontend URL in production!
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io',
  serveClient: false,
  pingInterval: 10000,
  pingTimeout: 5000,
  cookie: true,
})
export class WhoisGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(
    @InjectModel(WhoisMessage.name)
    private readonly messageModel: Model<WhoisMessage>,
    @InjectModel(User.name) // <--- Inject User model here
    private readonly userModel: Model<User>, // <--- Declare userModel
    @Inject(forwardRef(() => WhoisMessageService))
    private readonly messageService: WhoisMessageService, // Inject the service
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string;

    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id: string };
      this.userSockets.set(payload.id, client.id);

      console.log(`✅ User connected: ${payload.id}, socket: ${client.id}`);

      // Ensure the client joins a room specific to their userId for notifications
      client.join(`user-${payload.id}`); // This is important for notifications
      console.log(`Socket ${client.id} automatically joined personal room: user-${payload.id}`);


      this.server.emit('userOnline', payload.id);
    } catch (err) {
      console.warn('❌ Invalid token - disconnecting socket');
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        console.log(`👋 User disconnected: ${userId}, socket: ${client.id}`);
        this.server.emit('userOffline', userId);
        break;
      }
    }
  }

  public emitToUser(userId: string, event: string, payload: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  @SubscribeMessage('joinConversation')
  handleJoinConversation(
    @MessageBody() data: { userId1: string; userId2: string },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = [data.userId1, data.userId2].sort().join('-');
    client.join(roomName);
    console.log(`Socket ${client.id} joined conversation room: ${roomName}`);
  }

  // NEW: Event for joining personal notification room (redundant if handled in handleConnection, but good for clarity)
  @SubscribeMessage('joinNotifications')
  handleJoinNotifications(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    // This is already done in handleConnection, but if a client explicitly joins again, it's fine.
    // It also ensures that if a client re-connects, they always join their personal room.
    client.join(`user-${data.userId}`);
    console.log(`Socket ${client.id} joined explicit notification room for user: ${data.userId}`);
  }

  @SubscribeMessage('message:read')
  async handleRead(
    @MessageBody() data: { fromUserId: string; toUserId: string; messageIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const token = client.handshake.auth?.token as string;
    let currentUserId: string;
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id: string };
      currentUserId = payload.id;
    } catch (err) {
      console.warn('Read event rejected due to auth error');
      return;
    }

    if (currentUserId !== data.toUserId) {
        console.warn(`Attempt to mark messages for wrong user. Auth: ${currentUserId}, data.toUserId: ${data.toUserId}`);
        return;
    }

    // Use service method if you have one, or direct model update
    await this.messageModel.updateMany(
      { _id: { $in: data.messageIds }, toUserId: currentUserId, fromUserId: data.fromUserId, read: false },
      { $set: { read: true } },
    );

    // Emit read confirmation to the sender of the messages
    const roomName = [currentUserId, data.fromUserId].sort().join('-'); // Conversation room
    this.server.to(roomName).emit('message:read:confirm', {
      readerId: currentUserId,
      messageIds: data.messageIds,
    });
    console.log(`Read confirmation emitted to room ${roomName} for message IDs: ${data.messageIds}`);
  }

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody() data: { to: string; message: string; tempId?: string }, // Added tempId
    @ConnectedSocket() client: Socket
  ) {
    try {
      const token = client.handshake.auth?.token as string;
      const payload = jwt.verify(token, JWT_SECRET) as { id: string };
      const fromUserId = payload.id;

      if (!fromUserId) {
        throw new Error('Authenticated user ID not found in WebSocket handshake.');
      }
      // Validate recipient and sender before saving
      if (String(fromUserId) === String(data.to)) {
        client.emit('message:error', { tempId: data.tempId, error: 'cannot_send_to_self' });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(data.to)) {
        client.emit('message:error', { tempId: data.tempId, error: 'invalid_recipient_id' });
        return;
      }

      const receiverUser = await this.userModel.findById(data.to).lean();
      if (!receiverUser) {
        client.emit('message:error', { tempId: data.tempId, error: 'recipient_not_found_or_not_registered' });
        return;
      }

      const senderUser = await this.userModel.findById(fromUserId).lean();
      if (!senderUser) {
        client.emit('message:error', { tempId: data.tempId, error: 'sender_not_registered' });
        return;
      }

      // 1. Save the message using your service
      const savedMessage = await this.messageService.sendMessage(
        fromUserId,
        data.to,
        data.message
      );


      const messagePayload = {
        _id: savedMessage._id.toString(),
        message: savedMessage.message,
        fromUserId: savedMessage.fromUserId.toString(),
        toUserId: savedMessage.toUserId.toString(),
        createdAt: savedMessage.createdAt.toISOString(),
        read: savedMessage.read,
        username: senderUser?.username || 'Unknown',
        avatar: senderUser?.avatarUrl|| `https://i.pravatar.cc/40?u=${(savedMessage as any).fromUserId.toString()}`,
        reactions: ((savedMessage as any).reactions || []).map((r: any) => ({ emoji: r.emoji, fromUserId: String(r.fromUserId) })),
        tempId: data.tempId, // Crucial for frontend optimistic updates
      };

      // 3. Emit to all clients in the conversation room (both sender and receiver)
      const conversationRoom = [fromUserId, data.to].sort().join('-');
      this.server.to(conversationRoom).emit('message:new', messagePayload);
      console.log(`Message emitted to conversation room ${conversationRoom}:`, messagePayload);

      // 4. Emit a notification to the receiver's specific user room (if not self-chat)
      if (fromUserId !== data.to && senderUser) {
        const receiverSocketId = this.userSockets.get(data.to);
        const socketsInRoom = await this.server.in(conversationRoom).allSockets();
        const isRecipientInRoom = socketsInRoom.has(receiverSocketId as string);
      
        if (!isRecipientInRoom) {
          // persist notification
          try {
            await this.notificationService.createNotification(data.to, {
              type: 'new_message',
              fromUserId: new mongoose.Types.ObjectId(fromUserId),
              fromUsername: senderUser.username,
              messagePreview: savedMessage.message.substring(0, 50),
              conversationId: conversationRoom,
            })
          } catch (err) { console.warn('Failed to persist notification', err) }

          this.server.to(`user-${data.to}`).emit('notification:new', {
            type: 'new_message',
            fromUserId,
            fromUsername: senderUser.username,
            messagePreview: savedMessage.message.substring(0, 50),
            conversationId: conversationRoom,
            createdAt: savedMessage.createdAt.toISOString(),
          });
          console.log(`Notification emitted to receiver's personal room: user-${data.to}`);
        } else {
          console.log(`Notification skipped — user already in conversation room: ${conversationRoom}`);
        }
      }
      

    } catch (error) {
      console.error('Error handling message:', error);
      client.emit('message:error', {
        tempId: data.tempId,
        error: error.message || 'Failed to send message'
      });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { to: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const token = client.handshake.auth?.token as string;
      const payload = jwt.verify(token, JWT_SECRET) as { id: string };
      const fromUserId = payload.id; // Get sender's ID

      const roomName = [fromUserId, data.to].sort().join('-');
      this.server.to(roomName).emit('typing', { fromUserId: fromUserId }); // Emit sender's ID
      console.log(`User ${fromUserId} is typing to ${data.to}. Emitted to room: ${roomName}`);

    } catch (err) {
      console.warn('Typing event rejected due to auth error', err.message);
    }
  }

  @SubscribeMessage('stoppedTyping')
  async handleStoppedTyping(
    @MessageBody() data: { to: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const token = client.handshake.auth?.token as string;
      const payload = jwt.verify(token, JWT_SECRET) as { id: string };
      const fromUserId = payload.id; // Get sender's ID

      const roomName = [fromUserId, data.to].sort().join('-');
      this.server.to(roomName).emit('stoppedTyping', { fromUserId: fromUserId }); // Emit sender's ID
      console.log(`User ${fromUserId} stopped typing to ${data.to}. Emitted to room: ${roomName}`);
    } catch (err) {
      console.warn('Stopped typing event rejected due to auth error', err.message);
    }
  }

  @SubscribeMessage('message:reaction')
  async handleMessageReaction(
    @MessageBody() data: { messageId: string; emoji: string; toUserId: string }, // Added toUserId for potential room targeting
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const token = client.handshake.auth?.token as string;
      const payload = jwt.verify(token, JWT_SECRET) as { id: string };
      const fromUserId = payload.id; // User who is adding the reaction

      // Use service to add reaction to the message
      const updatedMessage = await this.messageService.addReaction(data.messageId, fromUserId, data.emoji);

      if (updatedMessage) {
        // Emit the reaction update to all clients in the conversation room
        const roomName = [fromUserId, data.toUserId].sort().join('-'); // Assuming toUserId is the other chat participant
        this.server.to(roomName).emit('message:reaction', {
          messageId: updatedMessage._id.toString(),
          reaction: {
            emoji: data.emoji,
            fromUserId: String(fromUserId), // User who added the reaction
          },
        });
        console.log(`Reaction ${data.emoji} added by ${fromUserId} to message ${data.messageId}. Emitted to room ${roomName}.`);
      }

    } catch (err) {
      console.error('Error handling message reaction:', err);
    }
  }
}