import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // recipient

  @Prop({ type: String })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  fromUserId?: Types.ObjectId;

  @Prop()
  fromUsername?: string;

  @Prop()
  messagePreview?: string;

  @Prop()
  conversationId?: string;

  @Prop({ default: false })
  read?: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
