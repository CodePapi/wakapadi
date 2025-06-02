// src/modules/feedback.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedbackService } from '../services/feedback.service';
import { Feedback, FeedbackSchema } from '../schemas/feedback.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Feedback.name, schema: FeedbackSchema }]),
  ],
  providers: [FeedbackService],
  exports: [FeedbackService], // if you need to use it in AppModule or elsewhere
})
export class FeedbackModule {}
