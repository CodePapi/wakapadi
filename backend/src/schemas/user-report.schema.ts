import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type UserReportDocument = UserReport & Document;

@Schema({ timestamps: true })
export class UserReport {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  reporterId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  reportedId: Types.ObjectId;

  @Prop({ required: true })
  reason: string;
}

export const UserReportSchema = SchemaFactory.createForClass(UserReport);
