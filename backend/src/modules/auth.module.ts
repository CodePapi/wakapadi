import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { User, UserSchema } from '../schemas/user.schema';
import { AuthGuard } from '../gateways/auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: 'APP_GUARD',
      useClass: AuthGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}


// src/modules/auth.module.ts
// import { Module } from '@nestjs/common';
// import { JwtModule } from '@nestjs/jwt';
// import { AuthService } from '../services/auth.service';
// import { AuthController } from '../controllers/auth.controller';

// @Module({
//   imports: [
//     JwtModule.register({}), // Configuration can be here or async
//   ],
//   controllers: [AuthController],
//   providers: [AuthService],
//   exports: [JwtModule], // This exports JwtService
// })
// export class AuthModule {}