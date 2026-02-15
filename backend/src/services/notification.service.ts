import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';

@Injectable()
export class NotificationService {
  constructor(@InjectModel(Notification.name) private readonly model: Model<NotificationDocument>) {}

  async createNotification(userId: string, payload: Partial<Notification>) {
    const doc = await this.model.create({ userId: new Types.ObjectId(userId), ...payload });
    return doc;
  }

  async getNotificationsForUser(userId: string, limit = 50) {
    return this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  }

  async markReadFromUser(userId: string, fromUserId: string) {
    await this.model.updateMany({ userId: new Types.ObjectId(userId), fromUserId: new Types.ObjectId(fromUserId), read: false }, { $set: { read: true } })
    return true
  }

  async markAllRead(userId: string) {
    await this.model.updateMany({ userId: new Types.ObjectId(userId), read: false }, { $set: { read: true } })
    return true
  }
}
