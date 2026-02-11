// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from '../services/auth.service';
import { User, UserSchema } from '../schemas/user.schema';
import { AuthController } from '../controllers/auth.controller';
import { ConfigModule } from '@nestjs/config';
import { DailyVisit, DailyVisitSchema } from '../schemas/daily-visit.schema';

@Module({
  imports: [
    ConfigModule, // ⬅️ Make sure this is here
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DailyVisit.name, schema: DailyVisitSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
