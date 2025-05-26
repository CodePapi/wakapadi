import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from './user.schema';

@Schema({
  timestamps: true,
//   indexes: [
//     { location: '2dsphere' },
//     { expiresAt: 1, expireAfterSeconds: 0 }
//   ]
})
export class WhoisPresence extends Document {
//   @Prop({ type: 'ObjectId', ref: 'User', required: true, index: true })
//   userId: User;

// @Prop({ type: mongoose.Schema.Types.Mixed, ref: 'User', required: true, index: true })
// userId: User | string;
@Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
userId: mongoose.Types.ObjectId;
  @Prop({ required: true, index: true })
  city: string;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location: {
    type: string;
    coordinates: [number, number];
  };

  @Prop({ default: true, index: true })
  visible: boolean;

  @Prop()
  status?: string;

  @Prop({ type: Object })
  socials?: {
    instagram?: string;
    whatsapp?: string;
  };

  @Prop({ default: Date.now })
  lastSeen: Date;

  @Prop()
  expiresAt: Date;
}

export const WhoisPresenceSchema = SchemaFactory.createForClass(WhoisPresence);