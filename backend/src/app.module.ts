import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { AppService } from './app.service';
import { TourModule } from './modules/tour.module';
import { ScraperModule } from './modules/scraper.module';
import { AssistantModule } from './modules/assistant.module';
import { WhoisModule } from './modules/whois.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SeedModule } from './modules/seed.module';
import { UserModule } from './modules/users.module';
import { AuthModule } from './modules/auth.module';
import { WhoisMessageModule } from './modules/whois-message.module';
import { PresenceModule } from './modules/PresenceModule';
import { ConfigModule } from '@nestjs/config';
import { CityModule } from './modules/city.module';
import { ContactModule } from './modules/contact.module';
import { GeolocationModule } from './modules/geolocation..module';
import { FeedbackModule } from './modules/feedback.module';
import { NotificationsModule } from './modules/notifications.module';

@Module({
  imports: [
    // MongooseModule.forRoot('mongodb://localhost/wakapadi'),
    ConfigModule.forRoot({ isGlobal: true }),

    ScheduleModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    AssistantModule,
    TourModule,
    ScraperModule,
    WhoisMessageModule,
    AuthModule,
    SeedModule,
    UserModule,
    CityModule,
    PresenceModule,
    WhoisModule,
    ContactModule,
    GeolocationModule,
    FeedbackModule,
    // Notifications
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
