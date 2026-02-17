import { Module, forwardRef } from '@nestjs/common';
import { ScraperService } from '../services/scraper.service';
import { LogsService } from '../services/logs.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TourModule } from './tour.module';
import { ScraperController } from '../controllers/scraper.controller';
import { CityModule } from './city.module';

@Module({
  imports: [forwardRef(() => CityModule), TourModule, ScheduleModule.forRoot()],
  providers: [ScraperService, LogsService],
  controllers: [ScraperController],
  exports: [ScraperService],
})
export class ScraperModule {}
