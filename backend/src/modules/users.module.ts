// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from '../services/user.service';
import { UsersController } from '../controllers/users.controller';
import { PublicUsersController } from '../controllers/public-users.controller';
import { User, UserSchema } from '../schemas/user.schema';
import { UserReport, UserReportSchema } from '../schemas/user-report.schema';
import { UserBlock, UserBlockSchema } from '../schemas/user-block.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserReport.name, schema: UserReportSchema },
      { name: UserBlock.name, schema: UserBlockSchema },
    ]),
    
  ],
  controllers: [UsersController, PublicUsersController],
  providers: [UsersService],
  exports: [MongooseModule, UsersService],
})
export class UserModule {}
