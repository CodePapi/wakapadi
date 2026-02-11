import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Delete,
  HttpCode,
} from '@nestjs/common';
import { TourService } from '../services/tour.service';
import { CreateTourDto } from '../types/tour.dto';

@Controller('tours')
export class TourController {
  constructor(private readonly tourService: TourService) {}

  @Get()
  findAll(@Query('location') location?: string) {
    return this.tourService.findAll(location);
  }

  @Post()
  create(@Body() tour: CreateTourDto) {
    return this.tourService.create(tour);
  }

  @Post('seed')
  async seedTours(@Body() tours: CreateTourDto[]) {
    return Promise.all(
      tours.map(async (tour: { title: string }) => {
        const exists = await this.tourService.findByTitle(tour.title);
        if (!exists) {
          return this.tourService.create(tour);
        }
      }),
    );
  }

  @Delete()
  @HttpCode(204)
  async deleteAllTours(): Promise<void> {
    await this.tourService.deleteAll();
  }

}
