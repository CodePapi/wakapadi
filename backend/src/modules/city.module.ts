// src/user/city.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CityService } from '../services/city.services';
import { CityController } from '../controllers/city.controller';
import { City, CitySchema } from '../schemas/city.schema';
import { ScraperModule } from './scraper.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: City.name, schema: CitySchema }]),
    forwardRef(() => ScraperModule),
    
  ],
  controllers: [CityController],
  providers: [CityService],
  exports: [MongooseModule, CityService],
})
export class CityModule {}
