import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class DailyVisit extends Document {
  @Prop({ required: true })
  deviceHash: string;

  @Prop({ required: true })
  day: string; // YYYY-MM-DD (UTC)
}

export const DailyVisitSchema = SchemaFactory.createForClass(DailyVisit);
DailyVisitSchema.index({ deviceHash: 1, day: 1 }, { unique: true });
