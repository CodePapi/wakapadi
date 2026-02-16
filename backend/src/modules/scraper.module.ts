import { Module, forwardRef } from '@nestjs/common';
import { ScraperService } from '../services/scraper.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TourModule } from './tour.module';
import { ScraperController } from '../controllers/scraper.controller';
import { CityModule } from './city.module';

@Module({
  imports: [forwardRef(() => CityModule), TourModule, ScheduleModule.forRoot()],
  providers: [ScraperService],
  controllers: [ScraperController],
  exports: [ScraperService],
})
export class ScraperModule {}
