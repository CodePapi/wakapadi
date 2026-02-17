// src/user/user.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from '../services/user.service';
import { UsersController } from '../controllers/users.controller';
import { PublicUsersController } from '../controllers/public-users.controller';
import { User, UserSchema } from '../schemas/user.schema';
import { UserReport, UserReportSchema } from '../schemas/user-report.schema';
import { UserBlock, UserBlockSchema } from '../schemas/user-block.schema';
import { WhoisMessageModule } from './whois-message.module';
import { WhoisModule } from './whois.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserReport.name, schema: UserReportSchema },
      { name: UserBlock.name, schema: UserBlockSchema },
    ]),
    // allow emitting socket events on block/unblock (use forwardRef to avoid circular import)
    forwardRef(() => WhoisMessageModule),
    forwardRef(() => WhoisModule),
    
  ],
  controllers: [UsersController, PublicUsersController],
  providers: [UsersService],
  exports: [MongooseModule, UsersService],
})
export class UserModule {}
