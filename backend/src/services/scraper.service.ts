/// src/scraper/scraper.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { TourService } from '../services/tour.service';
import { CityService } from '../services/city.services';
import { LogsService } from './logs.service';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { CronJob } from 'cron';

@Injectable()
export class ScraperService implements OnModuleInit {
  private readonly logger = new Logger(ScraperService.name);
  private readonly extraSourcesPath = path.resolve(
    __dirname,
    '../../..',
    'tourSources.json',
  );

  private readonly configPath: string
  private readonly scheduledJobName = 'scraper:scheduled'

  constructor(
    private readonly tourService: TourService,
    private readonly cityService: CityService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly logsService: LogsService,
  ) {
    this.configPath = path.resolve(__dirname, '../../..', 'scraper-config.json')
  }

  onModuleInit() {
    // Do NOT auto-start the scheduler by default. Only start if the persisted config
    // explicitly enabled it AND the environment allows automatic starts. This gives
    // admins full control via the dashboard. To enable automatic startup set
    // `ALLOW_AUTO_SCRAPE=true` in the environment (not recommended for multi-instance).
    try {
      const cfg = this.readConfig()
      const allow = String(process.env.ALLOW_AUTO_SCRAPE || '').toLowerCase() === 'true'
      if (cfg.enabled && allow) {
        this.pushLog(`Auto-starting scheduled scraper (cron: ${cfg.cron}) due to config and ALLOW_AUTO_SCRAPE=true`)
        this.startScheduler(cfg.cron)
      } else {
        this.pushLog(`Scheduler auto-start suppressed (config.enabled=${cfg.enabled}, ALLOW_AUTO_SCRAPE=${allow})`)
      }
    } catch (e) {
      this.pushWarn('Failed to evaluate scheduler auto-start: ' + (e?.message || e))
    }
  }

  private pushLog(msg: string) {
    try { this.logger.log(msg) } catch (e) {}
    try { this.logsService.add(msg) } catch (e) {}
  }

  private pushWarn(msg: string) {
    try { this.logger.warn(msg) } catch (e) {}
    try { this.logsService.add(msg) } catch (e) {}
  }

  private pushError(msg: string) {
    try { this.logger.error(msg) } catch (e) {}
    try { this.logsService.add(msg) } catch (e) {}
  }

  // Auto-scheduled scraping was removed from automatic startup.
  // Use `runScheduledScraping()` to perform a full run on-demand or use
  // `startScheduler` / `stopScheduler` via admin endpoints to control auto-scraping.
  async runScheduledScraping() {
    this.pushLog('⏰ Scheduled scrape started...');
    const cities = await this.cityService.getAllCities();
    for (const city of cities) {
      await this.scrapeCity(city, true);
    }
    this.pushLog('✅ Scheduled scrape complete');
  }

  // --- Scheduler control and configuration persistence ---
  private readConfig(): { enabled: boolean; cron: string } {
    try {
      if (!fs.existsSync(this.configPath)) return { enabled: false, cron: CronExpression.EVERY_DAY_AT_2AM }
      const raw = fs.readFileSync(this.configPath, 'utf-8')
      const parsed = JSON.parse(raw || '{}')
      return { enabled: Boolean(parsed.enabled), cron: parsed.cron || CronExpression.EVERY_DAY_AT_2AM }
    } catch (e) {
      this.pushWarn('Failed to read scraper config, using defaults')
      return { enabled: false, cron: CronExpression.EVERY_DAY_AT_2AM }
    }
  }

  private writeConfig(cfg: { enabled: boolean; cron: string }) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(cfg, null, 2), 'utf-8')
    } catch (e) {
      this.pushWarn('Failed to write scraper config: ' + (e?.message || e))
    }
  }

  startScheduler(cronExpr?: string) {
    const cfg = this.readConfig()
    const cronToUse = cronExpr || cfg.cron || CronExpression.EVERY_DAY_AT_2AM
    // If job exists, stop & remove first
    try {
      if (this.schedulerRegistry.doesExist('cron', this.scheduledJobName)) {
        const existing: CronJob = this.schedulerRegistry.getCronJob(this.scheduledJobName)
        existing.stop()
        this.schedulerRegistry.deleteCronJob(this.scheduledJobName)
      }
    } catch (e) {}

    const job = new CronJob(cronToUse, async () => {
      try {
        await this.runScheduledScraping()
      } catch (err) {
        this.pushError('Scheduled scraping failed: ' + (err?.message || err))
      }
    })

    this.schedulerRegistry.addCronJob(this.scheduledJobName, job)
    job.start()
    this.writeConfig({ enabled: true, cron: cronToUse })
    this.pushLog(`Scheduled scraper started with cron: ${cronToUse}`)
  }

  stopScheduler() {
    try {
      if (this.schedulerRegistry.doesExist('cron', this.scheduledJobName)) {
        const job: CronJob = this.schedulerRegistry.getCronJob(this.scheduledJobName)
        job.stop()
        this.schedulerRegistry.deleteCronJob(this.scheduledJobName)
      }
    } catch (e) {
      this.pushWarn('Failed to stop scheduler: ' + (e?.message || e))
    }
    this.writeConfig({ enabled: false, cron: this.readConfig().cron })
    this.pushLog('Scheduled scraper stopped')
  }

  getSchedulerStatus() {
    const cfg = this.readConfig()
    const running = this.schedulerRegistry.doesExist('cron', this.scheduledJobName)
    return { running, enabled: cfg.enabled, cron: cfg.cron }
  }

  setSchedulerCron(cronExpr: string) {
    const cfg = this.readConfig()
    this.writeConfig({ enabled: cfg.enabled, cron: cronExpr })
    // if running, restart with new cron
    if (this.schedulerRegistry.doesExist('cron', this.scheduledJobName)) {
      this.startScheduler(cronExpr)
    }
  }

  async scrapeCity(city: string, shouldDelete: boolean): Promise<void> {
    if (shouldDelete) {
      await this.tourService.deleteAllBySource(city, 'scraper');
      await this.tourService.deleteAllBySource(city, 'seed');
      await this.tourService.deleteAllBySource(city, 'seed-live');
      await this.tourService.deleteAllBySource(city, 'neweurope');
      await this.tourService.deleteAllBySource(city, 'munichwalk');
      for (const sourceType of this.getExtraSourceTypes()) {
        await this.tourService.deleteAllBySource(city, sourceType);
      }
    }

    try {
      await this.scrapeFreetourCity(city);
    } catch (err) {
      this.pushWarn(`⚠️ scrapeFreetourCity failed for ${city}: ${err?.message || err}`);
    }

    try {
      await this.scrapeSeededTours(city);
    } catch (err) {
      this.pushWarn(`⚠️ scrapeSeededTours failed for ${city}: ${err?.message || err}`);
    }

    try {
      await this.scrapeSeededExternalPages(city);
    } catch (err) {
      this.pushWarn(`⚠️ scrapeSeededExternalPages failed for ${city}: ${err?.message || err}`);
    }

    try {
      await this.scrapeNewEuropeToursCity(city);
    } catch (err) {
      this.pushWarn(`⚠️ scrapeNewEuropeToursCity failed for ${city}: ${err?.message || err}`);
    }

    try {
      await this.scrapeMunichWalkToursCity(city);
    } catch (err) {
      this.pushWarn(`⚠️ scrapeMunichWalkToursCity failed for ${city}: ${err?.message || err}`);
    }

    try {
      await this.scrapeExternalCatalogSources(city);
    } catch (err) {
      this.pushWarn(`⚠️ scrapeExternalCatalogSources failed for ${city}: ${err?.message || err}`);
    }
  }

  private getExtraSourceTypes(): string[] {
    try {
      if (!fs.existsSync(this.extraSourcesPath)) return [];
      const raw = fs.readFileSync(this.extraSourcesPath, 'utf-8');
      const parsed = JSON.parse(raw) as { sources?: Array<{ sourceType?: string }> };
      const types = (parsed.sources || [])
        .map((source) => source.sourceType)
        .filter((type): type is string => Boolean(type));
      return Array.from(new Set(types));
    } catch (err) {
      this.pushWarn(`⚠️ Failed to read extra sources config: ${err.message}`);
      return [];
    }
  }

  private slugifyCity(city: string): string {
    return city
      .toLowerCase()
      .replace(/\s*\(.*?\)\s*/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  }

  private async scrapeExternalCatalogSources(city: string): Promise<void> {
    if (!fs.existsSync(this.extraSourcesPath)) return;

    let config: {
      sources?: Array<{
        name: string;
        sourceType: string;
        urlTemplate: string;
        linkIncludes?: string[];
        linkExcludes?: string[];
        maxLinks?: number;
        cityAllowList?: string[];
      }>;
    };

    try {
      const raw = fs.readFileSync(this.extraSourcesPath, 'utf-8');
      config = JSON.parse(raw);
    } catch (err) {
      this.pushWarn(`⚠️ Failed to parse extra sources config: ${err.message}`);
      return;
    }

    const normalizedCity = city.trim().toLowerCase();
    const citySlug = this.slugifyCity(city);
    const sources = config.sources || [];

    for (const source of sources) {
      if (!source.urlTemplate || !source.sourceType) continue;
      if (source.cityAllowList && !source.cityAllowList.includes(citySlug)) {
        continue;
      }

      const listUrl = source.urlTemplate.replace('{city}', citySlug);
      let browser: puppeteer.Browser | null = null;

      try {
        browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
          executablePath: process.env.CHROME_PATH || undefined,
        });

        const page = await browser.newPage();
        await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const links = await page.evaluate((includes, excludes) => {
          const anchors = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
          return anchors
            .map((a) => a.href)
            .filter((href) => {
              if (!href) return false;
              if (includes?.length && !includes.some((needle) => href.includes(needle))) {
                return false;
              }
              if (excludes?.length && excludes.some((needle) => href.includes(needle))) {
                return false;
              }
              return true;
            });
        }, source.linkIncludes || [], source.linkExcludes || []);

        const uniqueLinks = Array.from(new Set(links)).slice(0, source.maxLinks || 20);
        if (!uniqueLinks.length) {
          this.pushLog(`ℹ️ No ${source.name} tours found for ${normalizedCity}`);
          continue;
        }

        for (const url of uniqueLinks) {
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            const meta = await page.evaluate(() => {
              const ogTitle =
                document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
                document.title ||
                '';
              const ogImage =
                document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
                '';
              return { ogTitle, ogImage };
            });

            await this.tourService.upsertByExternalUrl(url, {
              title: meta.ogTitle || `${source.name} Walking Tour`,
              location: normalizedCity,
              recurringSchedule: 'Recurring',
              sourceUrl: listUrl,
              externalPageUrl: url,
              image: meta.ogImage || '',
              sourceType: source.sourceType,
            });
          } catch (err) {
            this.pushWarn(
              `⚠️ Failed ${source.name} tour page ${url}: ${err.message}`,
            );
          }
        }
      } catch (err) {
        this.pushWarn(
          `⚠️ ${source.name} scraping skipped for ${normalizedCity}: ${err.message}`,
        );
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    }
  }

  private async scrapeFreetourCity(city: string): Promise<void> {
    const url = `https://www.freetour.com/${city}?price=0-0`;
    const browser = await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Important for Docker
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // May help in some cases
        '--disable-gpu'
      ],
      executablePath: process.env.CHROME_PATH || undefined // Use system Chrome if available
     });
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.city-tour__title', { timeout: 10000 });

      const tours = await page.evaluate(() => {
        const cards = document.querySelectorAll('.city-tour__title');
        const data: { title: string; time: string; externalPageUrl: string; image: string }[] = [];

        cards.forEach((titleNode) => {
          const card = titleNode.closest('.city-tour') as HTMLElement;
          const title = titleNode.textContent?.trim() ?? '';
          const time = card?.querySelector('.icon-time')?.textContent?.trim() ?? 'Recurring';
          const link = (card?.querySelector('a') as HTMLAnchorElement)?.href || '';
          const img = (card?.querySelector('img') as HTMLImageElement)?.src || '';
          if (title) data.push({ title, time, externalPageUrl: link, image: img });
        });

        return data;
      });

      for (const tour of tours) {
        const exists = await this.tourService.findByTitleOrUrl(
          tour.title,
          tour.externalPageUrl,
        );
        if (!exists) {
          await this.tourService.create({
            title: tour.title,
            location: city,
            recurringSchedule: tour.time,
            sourceUrl: url,
            externalPageUrl: tour.externalPageUrl,
            image: tour.image,
            sourceType: 'scraper',
          });
        }
      }

      this.pushLog(`✔ ${tours.length} tours scraped for ${city}`);
    } catch (err) {
      this.pushError(`❌ Failed to scrape ${city}: ${err.message}`);
    } finally {
      await browser.close();
    }
  }

  private async scrapeSeededTours(city: string): Promise<void> {
    try {
      const seedPath = path.resolve(__dirname, '../../..', 'tourSeed.json');
      const raw = fs.readFileSync(seedPath, 'utf-8');
      const tours = JSON.parse(raw) as Array<{
        title: string;
        location: string;
        recurringSchedule?: string;
        sourceUrl?: string;
        externalPageUrl?: string;
        image?: string;
      }>;

      const normalizedCity = city.trim().toLowerCase();
      const filtered = tours.filter(
        (tour) => tour.location?.trim().toLowerCase() === normalizedCity,
      );

      for (const tour of filtered) {
        const exists = await this.tourService.findByTitleOrUrl(
          tour.title,
          tour.externalPageUrl || '',
        );
        if (!exists) {
          await this.tourService.create({
            title: tour.title,
            location: normalizedCity,
            recurringSchedule: tour.recurringSchedule || 'Recurring',
            sourceUrl: tour.sourceUrl || 'seed',
            externalPageUrl: tour.externalPageUrl || '',
            image: tour.image || '',
            sourceType: 'seed',
          });
        }
      }

      if (filtered.length) {
        this.pushLog(
          `✔ ${filtered.length} seeded tours added for ${normalizedCity}`,
        );
      }
    } catch (err) {
      this.pushError(`❌ Failed to load seeded tours: ${err.message}`);
    }
  }

  private async scrapeSeededExternalPages(city: string): Promise<void> {
    let browser: puppeteer.Browser | null = null;

    try {
      const seedPath = path.resolve(__dirname, '../../..', 'tourSeed.json');
      const raw = fs.readFileSync(seedPath, 'utf-8');
      const tours = JSON.parse(raw) as Array<{
        title: string;
        location: string;
        recurringSchedule?: string;
        sourceUrl?: string;
        externalPageUrl?: string;
        image?: string;
      }>;

      const normalizedCity = city.trim().toLowerCase();
      const targets = tours.filter(
        (tour) =>
          tour.location?.trim().toLowerCase() === normalizedCity &&
          tour.externalPageUrl,
      );

      if (!targets.length) return;

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
        executablePath: process.env.CHROME_PATH || undefined,
      });

      const page = await browser.newPage();

      for (const tour of targets) {
        try {
          await page.goto(tour.externalPageUrl!, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });

          const meta = await page.evaluate(() => {
            const ogTitle =
              document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
              document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
              document.title ||
              '';
            const ogImage =
              document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
              document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
              '';

            return { ogTitle, ogImage };
          });

          const title = meta.ogTitle || tour.title;
          const image = meta.ogImage || tour.image || '';
          const sourceUrl = tour.sourceUrl || new URL(tour.externalPageUrl!).origin;

          await this.tourService.upsertByExternalUrl(tour.externalPageUrl!, {
            title,
            location: normalizedCity,
            recurringSchedule: tour.recurringSchedule || 'Recurring',
            sourceUrl,
            externalPageUrl: tour.externalPageUrl!,
            image,
            sourceType: 'seed-live',
          });
        } catch (err) {
          this.pushWarn(
            `⚠️ Failed to scrape seeded tour page ${tour.externalPageUrl}: ${err.message}`,
          );
        }
      }

      this.pushLog(`✔ Seeded live tours refreshed for ${normalizedCity}`);
    } catch (err) {
      this.pushError(`❌ Failed seeded live scraping: ${err.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async scrapeNewEuropeToursCity(city: string): Promise<void> {
    let browser: puppeteer.Browser | null = null;

    try {
      const normalizedCity = city.trim().toLowerCase();
      const listUrl = `https://www.neweuropetours.eu/${normalizedCity}/en/`;

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
        executablePath: process.env.CHROME_PATH || undefined,
      });

      const page = await browser.newPage();
      await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a')) as HTMLAnchorElement[];
        return anchors
          .map((a) => a.href)
          .filter((href) =>
            href &&
            href.includes('neweuropetours.eu') &&
            (href.includes('/free-tour-') || href.includes('/free-walking-tour')),
          );
      });

      const uniqueLinks = Array.from(new Set(links)).slice(0, 20);

      for (const url of uniqueLinks) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          const meta = await page.evaluate(() => {
            const ogTitle =
              document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
              document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
              document.title ||
              '';
            const ogImage =
              document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
              document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
              '';
            return { ogTitle, ogImage };
          });

          const title = meta.ogTitle || 'Free Walking Tour';
          const image = meta.ogImage || '';

          await this.tourService.upsertByExternalUrl(url, {
            title,
            location: normalizedCity,
            recurringSchedule: 'Recurring',
            sourceUrl: listUrl,
            externalPageUrl: url,
            image,
            sourceType: 'neweurope',
          });
        } catch (err) {
          this.pushWarn(`⚠️ Failed NewEurope tour page ${url}: ${err.message}`);
        }
      }

      if (!uniqueLinks.length) {
        this.pushLog(`ℹ️ No NewEurope tours found for ${normalizedCity}`);
      }
    } catch (err) {
      this.pushWarn(`⚠️ NewEurope scraping skipped for ${city}: ${err.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private async scrapeMunichWalkToursCity(city: string): Promise<void> {
    const normalizedCity = city.trim().toLowerCase();
    if (normalizedCity !== 'munich') return;

    let browser: puppeteer.Browser | null = null;

    try {
      const listUrl = 'https://www.munichwalktours.de/free-walking-tours-munich';

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
        executablePath: process.env.CHROME_PATH || undefined,
      });

      const page = await browser.newPage();
      await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const meta = await page.evaluate(() => {
        const ogTitle =
          document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
          document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
          document.title ||
          '';
        const ogImage =
          document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
          document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
          '';
        return { ogTitle, ogImage };
      });

      await this.tourService.upsertByExternalUrl(listUrl, {
        title: meta.ogTitle || 'Munich Free Walking Tours',
        location: normalizedCity,
        recurringSchedule: 'Recurring',
        sourceUrl: listUrl,
        externalPageUrl: listUrl,
        image: meta.ogImage || '',
        sourceType: 'munichwalk',
      });
    } catch (err) {
      this.pushWarn(`⚠️ Munich Walk Tours scraping skipped: ${err.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }


  async scrapeNewCityOnce(city: string): Promise<{ added: boolean; message: string }> {
    // Use city service formatter to normalize for storage and matching (handles "Halle (Saale)")
    const formatted = this.cityService.formatForStorage(city);

    const exists = await this.cityService.cityExists(formatted);
    if (exists) {
      return { added: false, message: `${formatted} already exists in the database.` };
    }

    // Attempt to add the city. `addSingleCity` returns true only if it actually inserted.
    const added = await this.cityService.addSingleCity(formatted);
    if (!added) {
      // Another process likely added the city concurrently — skip scraping to avoid duplicate work.
      return { added: false, message: `${formatted} was added concurrently; skipping scrape.` };
    }

    // Only scrape if we successfully inserted the city ourselves.
    await this.scrapeCity(formatted, false);
    return { added: true, message: `Scraping complete for new city: ${formatted}` };
  }
  
  async scrapeSingleTour(city: string, tourSlug: string, retries = 3): Promise<any> {
    const url = `https://www.freetour.com/${city}/${tourSlug}`;
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });
  
      const page = await browser.newPage();
      
      // Set realistic viewport
      await page.setViewport({ width: 1280, height: 800 });
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  
      // Enable request interception to block unnecessary resources
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font', 'script'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });
  
      let response;
      try {
        response = await page.goto(url, { 
          waitUntil: 'networkidle2', 
          timeout: 60000 
        });
        
        if (!response.ok()) {
          throw new Error(`HTTP ${response.status()} - ${response.statusText()}`);
        }
      } catch (err) {
        if (retries > 0) {
          this.pushWarn(`Retrying (${retries} left) for ${url}`);
          return this.scrapeSingleTour(city, tourSlug, retries - 1);
        }
        throw err;
      }
  
      // Rest of your scraping logic...
      
    } catch (error) {
      this.pushError(`Error scraping tour ${tourSlug} in ${city}: ${error.message}`);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

// Example usage:
// scrapeSingleTour('rome', 'ancient-rome-walking-tour')
//   .then(data => console.log(data))
//   .catch(err => console.error(err));



// import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { TourService } from '../services/tour.service';
// import { CityService } from '../services/city.services';
// import axios from 'axios';
// import * as cheerio from 'cheerio';

// @Injectable()
// export class ScraperService {
//   private readonly logger = new Logger(ScraperService.name);
//   private readonly axiosInstance = axios.create({
//     timeout: 30000,
//     headers: {
//       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
//     }
//   });

//   constructor(
//     private readonly tourService: TourService,
//     private readonly cityService: CityService,
//   ) {}

//   @Cron(CronExpression.EVERY_DAY_AT_2AM)
//   async runScheduledScraping() {
//     this.logger.log('⏰ Scheduled scrape started...');
//     const cities = await this.cityService.getAllCities();
//     for (const city of cities) {
//       await this.scrapeCity(city, true);
//     }
//     this.logger.log('✅ Scheduled scrape complete');
//   }

//   async scrapeCity(city: string, shouldDelete: boolean): Promise<void> {
//     const url = `https://www.freetour.com/${city}?price=0-0`;
    
//     try {
//       const response = await this.axiosInstance.get(url);
//       const $ = cheerio.load(response.data);

//       const tours:any = [];
//       $('.city-tour').each((_, element) => {
//         const card = $(element);
//         const title = card.find('.city-tour__title').text()?.trim() || '';
//         if (!title) return;

//         tours.push({
//           title,
//           time: card.find('.icon-time').text()?.trim() || 'Recurring',
//           externalPageUrl: card.find('a').attr('href') || '',
//           image: card.find('img').attr('src') || ''
//         });
//       });

//       if (shouldDelete) {
//         await this.tourService.deleteAllBySource(city, 'scraper');
//       }

//       for (const tour of tours) {
//         await this.tourService.create({
//           title: tour.title,
//           location: city,
//           recurringSchedule: tour.time,
//           sourceUrl: url,
//           externalPageUrl: tour.externalPageUrl,
//           image: tour.image,
//           sourceType: 'scraper',
//         });
//       }

//       this.logger.log(`✔ ${tours.length} tours scraped for ${city}`);
//     } catch (err) {
//       this.logger.error(`❌ Failed to scrape ${city}: ${err.message}`);
//     }
//   }

//   async scrapeNewCityOnce(city: string): Promise<{ added: boolean; message: string }> {
//     const normalizedCity = city.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
  
//     const exists = await this.cityService.cityExists(normalizedCity);
//     if (exists) {
//       return { added: false, message: `${normalizedCity} already exists in the database.` };
//     }
//     await this.cityService.addSingleCity(normalizedCity);
//     await this.scrapeCity(normalizedCity, false);
//     return { added: true, message: `Scraping complete for new city: ${normalizedCity}` };
//   }
  
//   async scrapeSingleTour(city: string, tourSlug: string, retries = 3): Promise<any> {
//     const url = `https://www.freetour.com/${city}/${tourSlug}`;
    
//     try {
//       const response = await this.axiosInstance.get(url);
//       const $ = cheerio.load(response.data);

//       const getText = (selector: string) => $(selector).text()?.trim() || null;
//       const getList = (selector: string) => $(selector).map((_, el) => $(el).text()?.trim()).get();
//       const getImages = (selector: string) => $(selector).map((_, el) => $(el).attr('src')).get();

//       const getBrPointText = (selector: string) => {
//         const el = $(selector);
//         if (!el.length) return null;
//         return el.html()?.split('<br>').map(item => item.replace(/<[^>]*>/g, '').trim()).filter(Boolean) || [];
//       };

//       const structuredData = this.parseStructuredData($);
//       const tourMapUrl = $(".tour-maps a").attr('href') || null;
//       const [latitude, longitude] = this.parseCoordinates(tourMapUrl);

//       return {
//         title: getText('h1.tour-title'),
//         tourRating: getText('.tour-rating__count'),
//         description: getText('.tour-block__text'),
//         mainImage: getImages('.tour-gallery__item img'),
//         details: getList('.tour-details__info-value'),
//         provider: {
//           name: getText(".tour-company__link"),
//           url: $(".tour-company__link").attr('href')
//         },
//         activities: getList(".tour-list li"),
//         takeNote: getBrPointText(".tour-text"),
//         tourType: getText('.tour-type'),
//         tourMap: tourMapUrl,
//         latitude,
//         longitude,
//         tourUrl: url,
//         ...structuredData
//       };
//     } catch (error) {
//       if (retries > 0) {
//         this.logger.warn(`Retrying (${retries} left) for ${url}`);
//         return this.scrapeSingleTour(city, tourSlug, retries - 1);
//       }
//       this.logger.error(`Error scraping tour ${tourSlug} in ${city}: ${error.message}`);
//       throw error;
//     }
//   }

//   private parseStructuredData($: cheerio.CheerioAPI): any {
//     try {
//       const ldJson = $('script[type="application/ld+json"]').html();
//       return ldJson ? JSON.parse(ldJson) : null;
//     } catch (e) {
//       this.logger.error('Error parsing structured data', e);
//       return null;
//     }
//   }

//   private parseCoordinates(tourMapUrl: string | null): [number | null, number | null] {
//     if (!tourMapUrl) return [null, null];
//     const match = tourMapUrl.match(/maps\?q=([-.\d]+),([-.\d]+)/);
//     return match ? [parseFloat(match[1]), parseFloat(match[2])] : [null, null];
//   }
// }