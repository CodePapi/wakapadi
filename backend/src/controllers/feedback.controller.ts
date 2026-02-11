import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FeedbackService } from '../services/bot_feedback.service';
import { AuthGuard } from '../gateways/auth.guard';

@Controller('feedback')
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Get()
  async getFeedback(@Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) : 20;
    return this.feedbackService.getRecentFeedback(parsedLimit);
  }

  @Get('stats')
  async getStats() {
    return this.feedbackService.analyzeFeedback();
  }
}
