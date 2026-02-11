import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhoisMessageService } from '../services/whois-message.service';
import { WhoisMessageController } from '../controllers/whois-message.controller';
import {
  WhoisMessage,
  WhoisMessageSchema,
} from '../schemas/whois-message.schema';
import { WhoisGateway } from '../gateways/whois.gateway';
import { User, UserSchema } from '../schemas/user.schema';
import { UserModule } from './users.module';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: WhoisMessage.name, schema: WhoisMessageSchema },
      { name: User.name, schema: UserSchema }, // ✅ ADD THIS LINE
    ]),
  ],
  controllers: [WhoisMessageController],
  providers: [WhoisMessageService, WhoisGateway],
  exports: [WhoisMessageService, WhoisGateway], // 👈 THIS is what was missing
})
export class WhoisMessageModule {}
