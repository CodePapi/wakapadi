import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from '../schemas/notification.schema';
import { NotificationService } from '../services/notification.service';
import { NotificationsController } from '../controllers/notifications.controller';
import { WhoisMessageModule } from './whois-message.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    forwardRef(() => WhoisMessageModule),
  ],
  providers: [NotificationService],
  controllers: [NotificationsController],
  exports: [NotificationService],
})
export class NotificationsModule {}
