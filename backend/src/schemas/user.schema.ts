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

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  username: string;

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

  updatedAt: Date
}

export const UserSchema = SchemaFactory.createForClass(User);
