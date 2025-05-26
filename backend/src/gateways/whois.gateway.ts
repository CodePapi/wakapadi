import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WhoisMessage } from '../schemas/whois-message.schema';
import { User } from '../schemas/user.schema';
import { ConfigService } from '@nestjs/config';
import { Inject, forwardRef } from '@nestjs/common';
import { UserPresenceService } from 'src/services/user-presence.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 15000,
})
export class WhoisGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly userSockets = new Map<string, string>(); // userId -> socketId
  private readonly typingUsers = new Map<string, NodeJS.Timeout>(); // userId -> timeout

  constructor(
    @Inject(forwardRef(() => UserPresenceService))
    private readonly userPresenceService: UserPresenceService,
  
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(WhoisMessage.name) private readonly messageModel: Model<WhoisMessage>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Update user online status
      await this.userModel.updateOne(
        { _id: payload.sub },
        { isOnline: true, lastActive: new Date() }
      );

      this.userSockets.set(payload.sub, client.id);
      this.server.emit('userOnline', payload.sub);
    } catch (error) {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        
        // Update user offline status with delay to avoid flickering
        setTimeout(async () => {
          if (!this.userSockets.has(userId)) {
            await this.userModel.updateOne(
              { _id: userId },
              { isOnline: false }
            );
            this.server.emit('userOffline', userId);
          }
        }, 5000);
        
        break;
      }
    }
  }

  @SubscribeMessage('message:typing')
  async handleTyping(
    @MessageBody() data: { toUserId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    // Notify recipient
    this.emitToUser(data.toUserId, 'userTyping', { userId });

    // Clear previous timeout
    if (this.typingUsers.has(userId)) {
      clearTimeout(this.typingUsers.get(userId));
    }

    // Set new timeout (stop typing after 3s)
    this.typingUsers.set(
      userId,
      setTimeout(() => {
        this.emitToUser(data.toUserId, 'userStoppedTyping', { userId });
        this.typingUsers.delete(userId);
      }, 3000)
    );
  }

  
  @SubscribeMessage('message:read')
  async handleReadReceipt(
    @MessageBody() data: { messageIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.getUserIdFromSocket(client);
    if (!userId) return;

    await this.messageModel.updateMany(
      { _id: { $in: data.messageIds }, toUserId: userId },
      { $set: { read: true, readAt: new Date() } }
    );

    // Notify senders their messages were read
    const messages = await this.messageModel.find({ _id: { $in: data.messageIds } });
    const uniqueSenders = new Set(messages.map(m => m.fromUserId.toString()));

    uniqueSenders.forEach(senderId => {
      this.emitToUser(senderId, 'messagesRead', {
        readerId: userId,
        messageIds: messages
          .filter(m => m.fromUserId.toString() === senderId)
          .map(m => m._id),
      });
    });
  }


  // In WhoisGateway
// Fix in whois.gateway.ts
@SubscribeMessage('presence:update')
async handlePresenceUpdate(
  @MessageBody() data: { city: string, isOnline: boolean },
  @ConnectedSocket() client: Socket
) {
  const userId = this.getUserIdFromSocket(client);
  if (!userId) return; // Add null check
  
  await this.userPresenceService.updateUserPresence(userId, data.isOnline);
  this.server.emit('presence:updated', { userId, ...data });
}

  public emitToUser(userId: string, event: string, payload: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, payload);
    }
  }

  private getUserIdFromSocket(client: Socket): string | null {
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) return userId;
    }
    return null;
  }
}