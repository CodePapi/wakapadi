import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TourModule } from './modules/tour.module';
import { ScraperModule } from './modules/scraper.module';
import { AssistantModule } from './modules/assistant.module';
import { WhoisModule } from './modules/whois.module';
import { SeedModule } from './modules/seed.module';
import { UserModule } from './modules/users.module';
import { AuthModule } from './modules/auth.module';
import * as Joi from 'joi';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './gateways/auth.guard';

@Module({
  imports: [
    // Configuration modules (first)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.production'],
      cache: true,
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        // REDIS_HOST: Joi.string().default('localhost'),
        // REDIS_PORT: Joi.number().default(6379),
        THROTTLE_TTL: Joi.number().default(60),
        THROTTLE_LIMIT: Joi.number().default(100),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60s' },
      }),
      inject: [ConfigService],
    }),

    // Security modules
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{
          ttl: config.get<number>('THROTTLE_TTL', 60),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        }],
        ignoreUserAgents: [/nestjs/i],
      }),
    }),

    // Database connections
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
        retryAttempts: 5, // Increased retry attempts
        retryDelay: 2000, // Increased delay between retries
        connectionFactory: (connection) => {
          connection.on('connected', () => {
            console.log('MongoDB connected successfully');
          });
          return connection;
        },
      }),
      inject: [ConfigService],
    }),

    // RedisModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: (configService: ConfigService) => ({
    //     config: {
    //       host: configService.get<string>('REDIS_HOST', 'localhost'),
    //       port: configService.get<number>('REDIS_PORT', 6379),
    //       retryStrategy: (times) => {
    //         const delay = Math.min(times * 50, 2000);
    //         return delay;
    //       },
    //       reconnectOnError: (err) => {
    //         console.error('Redis connection error:', err);
    //         return true;
    //       },
    //     },
    //   }),
    // }),

    // Application feature modules
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    WhoisModule,
    AssistantModule,
    TourModule,
    ScraperModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [ AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
     
    },
  ],
})
export class AppModule {}