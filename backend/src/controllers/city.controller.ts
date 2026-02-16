import { Body, Controller, Get, Post } from '@nestjs/common';
import { CityService } from '../services/city.services';
import { ScraperService } from '../services/scraper.service';

@Controller('cities')
export class CityController {
  constructor(
    private readonly cityService: CityService,
    private readonly scraperService: ScraperService,
  ) {}

  @Post('add')
  async addCities(@Body('cities') cities: string[]) {
    const added = await this.cityService.addCities(cities);

    // Fire-and-forget scraping for newly added cities so we're not blocking the request.
    try {
      for (const city of added) {
        // call scraper but don't await to keep API responsive
        this.scraperService.scrapeNewCityOnce(city).catch((err) => {
          // log but don't fail the API call
          // eslint-disable-next-line no-console
          console.warn(`Failed to scrape newly added city ${city}:`, err?.message || err);
        });
      }
    } catch (e) {
      // ignore errors here - scraping is best-effort
    }

    return { added };
  }

  @Get('all')
  async getAllCities() {
    const cities = await this.cityService.getAllCities();
    return cities;
  }
}