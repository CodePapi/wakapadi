import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type UserBlockDocument = UserBlock & Document;

@Schema({ timestamps: true })
export class UserBlock {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  blockerId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  blockedId: Types.ObjectId;
}

export const UserBlockSchema = SchemaFactory.createForClass(UserBlock);
