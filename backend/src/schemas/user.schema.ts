// src/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
class SocialLinks {
  @Prop()
  instagram?: string;

  @Prop()
  twitter?: string;

  @Prop()
  whatsapp?: string;
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false })
  password: string;

  @Prop({ required: true })
  username: string;

  @Prop({ unique: true, sparse: true })
  deviceIdHash?: string;

  @Prop()
  gender?: string;

  @Prop({ default: 'traveller' }) // or 'assistant'
  role: string;

  @Prop()
  avatarUrl?: string;

  @Prop()
  bio?: string;

  @Prop({ type: SocialLinks })
  socials?: SocialLinks;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ type: [String], default: [] })
  travelPrefs: string[];

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop({ default: true })
  profileVisible: boolean;

  @Prop({ default: 'anonymous' }) // 'local' or 'anonymous'
  authProvider: 'local' | 'anonymous';

  @Prop()
  lastSeenAt?: Date;
  
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
