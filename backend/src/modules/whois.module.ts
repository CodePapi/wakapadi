// src/modules/whois.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { WhoisPresence, WhoisPresenceSchema } from '../schemas/whois.schema';
import { WhoisMessage, WhoisMessageSchema } from '../schemas/whois-message.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { WhoisService } from '../services/whois.service';
import { WhoisGateway } from '../gateways/whois.gateway';
import { UserModule } from './users.module';
import { AuthModule } from './auth.module';
import { WhoisController } from 'src/controllers/whois.controller';

@Module({
  imports: [
    forwardRef(() => AuthModule), // For JwtService
    forwardRef(() => UserModule), // For UserModel
    MongooseModule.forFeature([
      { name: WhoisPresence.name, schema: WhoisPresenceSchema },
      { name: WhoisMessage.name, schema: WhoisMessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WhoisController],
  providers: [
    WhoisService,
    WhoisGateway,
  ],
  exports: [
    WhoisService,
    WhoisGateway,
  ],
})
export class WhoisModule {}