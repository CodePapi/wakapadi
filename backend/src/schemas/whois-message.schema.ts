import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { User } from './user.schema';

@Schema({
  timestamps: true,
  // indexes: [
  //   { fromUserId: 1, toUserId: 1 },
  //   { createdAt: -1 },
  //   { expiresAt: 1, expireAfterSeconds: 0 }
  // ]
})
export class WhoisMessage extends Document {
  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  fromUserId: User;

  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  toUserId: User;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ default: () => new Date(Date.now() + 48 * 60 * 60 * 1000) }) // 48 hours TTL
  expiresAt: Date;
}

export const WhoisMessageSchema = SchemaFactory.createForClass(WhoisMessage);