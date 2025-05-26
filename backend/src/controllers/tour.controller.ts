import { Controller, Get, Post, Body, Query, Delete, HttpCode  } from '@nestjs/common';
import { TourService } from '../services/tour.service';
import { Tour } from '../schemas/tour.schema';
import { CreateTourDto } from '../types/tour.dto';
import { Public } from 'src/gateways/decorators/public.decorator';


@Controller('tours')
export class TourController {
  constructor(private readonly tourService: TourService) {}

  @Get()
  @Public() // This endpoint is publicly accessible
  findAll(@Query('location') location?: string) {
    return this.tourService.findAll(location);
  }

  @Post()
  @Public() // This endpoint is publicly accessible
  create(@Body() tour: CreateTourDto) {
    return this.tourService.create(tour);
  }

  @Post('seed')
  @Public() // This endpoint is publicly accessible
  async seedTours(@Body() tours: CreateTourDto[]) {
    return Promise.all(
      tours.map(async (tour:{title:string}) => {
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

