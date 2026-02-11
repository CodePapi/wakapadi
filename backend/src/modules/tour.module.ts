import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Tour, TourSchema } from '../schemas/tour.schema';
import { TourService } from '../services/tour.service';
import { TourController } from '../controllers/tour.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Tour.name, schema: TourSchema }])],
  controllers: [TourController],
  providers: [TourService],
  exports: [TourService, MongooseModule], // 👈 THIS is what was missing

})
export class TourModule {}
