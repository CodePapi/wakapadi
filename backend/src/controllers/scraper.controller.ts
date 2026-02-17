
// @Controller('scraper')
// export class ScraperController {
//   constructor(private readonly scraperService: ScraperService) {}

//   @Get()
//   triggerScraper() {
//     return this.scraperService.scrapeSampleSite();
//   }
// }


// src/scraper/scraper.controller.ts
import { Controller, Post, Body, Get, Delete } from '@nestjs/common';
import { ScraperService } from '../services/scraper.service';
import { LogsService } from '../services/logs.service';

@Controller('scraper')
export class ScraperController {
  constructor(private readonly scraperService: ScraperService, private readonly logsService: LogsService) {}

  @Post('run')
  async runManualScrape(@Body('city') city?: string) {
    try {
      // clear previous run logs
      try { this.logsService.clear() } catch (e) {}
      if (city) {
        await this.scraperService.scrapeCity(city, true);
        return { message: `Scraped city: ${city}` };
      }

      await this.scraperService.runScheduledScraping();
      return { message: 'Scraped all cities' };
    } catch (err) {
      // Log full error server-side for debugging
      console.error('Error in /scraper/run:', err?.stack || err);
      // Return a concise error for the client while exposing the message for local debugging
      return { statusCode: 500, message: 'Scrape failed', detail: err?.message || String(err) };
    }
  }

  @Get('logs')
  async getLogs() {
    return this.logsService.getAll()
  }

  @Delete('logs')
  async clearLogs() {
    this.logsService.clear()
    return { message: 'cleared' }
  }

  // Admin endpoints to control scheduled scraping (no auth by design per request)
  @Get('status')
  async status() {
    return this.scraperService.getSchedulerStatus();
  }

  @Post('pause')
  async pause() {
    this.scraperService.stopScheduler();
    return { message: 'scraper paused' };
  }

  @Post('resume')
  async resume(@Body() body: any) {
    // optional cron in body
    const cron = body?.cron;
    this.scraperService.startScheduler(cron);
    return { message: 'scraper resumed', cron: cron || this.scraperService.getSchedulerStatus().cron };
  }

  @Post('schedule')
  async schedule(@Body() body: any) {
    const cron = body?.cron;
    if (!cron) return { error: 'missing cron' };
    this.scraperService.setSchedulerCron(cron);
    return { message: 'schedule updated', cron };
  }

  @Post('new/city')
  async scrapeNewCityOnce(@Body('city') city: string) {
  const tours=  await this.scraperService.scrapeNewCityOnce(city);
  console.log("tours", tours)
    return tours;
  }


  @Post('scrape-tour')
  async getTour(@Body() body: { city: string; slug: string }) {
    return this.scraperService.scrapeSingleTour(body.city, body.slug);
  }
}
