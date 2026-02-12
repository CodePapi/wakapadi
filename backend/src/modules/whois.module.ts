// src/whois/whois.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhoisPresence, WhoisPresenceSchema } from '../schemas/whois.schema';
import { WhoisService } from '../services/whois.service';
import { WhoisController } from '../controllers/whois.controller';
import { WhoisMessage, WhoisMessageSchema } from '../schemas/whois-message.schema';
import { UserSchema, User } from '../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhoisPresence.name, schema: WhoisPresenceSchema },
      { name: WhoisMessage.name, schema: WhoisMessageSchema },
      { name: User.name, schema: UserSchema }, // ✅ ADD THIS LINE

    ]),
  ],
  controllers: [WhoisController],
  providers: [WhoisService],
  exports: [WhoisService],
})
export class WhoisModule {}
