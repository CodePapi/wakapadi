// src/modules/users.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { User, UserSchema } from '../schemas/user.schema';
import { WhoisPresence, WhoisPresenceSchema } from '../schemas/whois.schema';
import { UserPresenceService } from '../services/user-presence.service';
import { WhoisModule } from './whois.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: WhoisPresence.name, schema: WhoisPresenceSchema },
    ]),
    // RedisModule,
    forwardRef(() => WhoisModule), // Break circular dependency
  ],
  providers: [UserPresenceService],
  exports: [UserPresenceService, MongooseModule],
})
export class UserModule {}