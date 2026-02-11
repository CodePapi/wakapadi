import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tour, TourDocument } from '../schemas/tour.schema';

@Injectable()
export class TourService {
    [x: string]: any;
  private readonly logger = new Logger(TourService.name);
    constructor(
      @InjectModel(Tour.name) private tourModel: Model<TourDocument>,
    ) {}
  
  async create(data: Partial<Tour>): Promise<Tour> {
    const newTour = new this.tourModel(data);
    return newTour.save();
  }

  async upsertByExternalUrl(
    externalPageUrl: string,
    data: Partial<Tour>,
  ): Promise<Tour> {
    if (!externalPageUrl) {
      return this.create(data);
    }

    return this.tourModel
      .findOneAndUpdate(
        { externalPageUrl },
        { $set: data },
        { new: true, upsert: true },
      )
      .exec();
  }

  async findAll(location?: string): Promise<Tour[]> {
    if (location) {
      return this.tourModel.find({ location: new RegExp(location, 'i') }).exec();
    }
    return this.tourModel.find().exec();
  }  

  async findByTitle(title: string): Promise<Tour | null> {
    return this.tourModel.findOne({ title }).exec();
  }


    /**
   * Finds a tour by its title OR its external page URL.
   * This is crucial for preventing duplicate entries during scraping.
   * @param title The title of the tour.
   * @param externalPageUrl The direct URL to the tour's external page.
   * @returns The found Tour document or null if not found.
   */
    async findByTitleOrUrl(title: string, externalPageUrl: string): Promise<TourDocument | null> {
        try {
          // Mongoose uses $or operator for OR conditions
          return await this.tourModel.findOne({
            $or: [
              { title: title },
              { externalPageUrl: externalPageUrl },
            ],
          }).exec();
        } catch (error) {
          this.logger.error(`Error finding tour by title "${title}" or URL "${externalPageUrl}": ${error.message}`);
          return null; // Return null on error, or rethrow if you want the calling service to handle it
        }
      }

      
  async deleteAll(): Promise<void> {
    await this.tourModel.deleteMany({});
  }

  async deleteAllBySource(location: string, sourceType: string): Promise<void> {
    await this.tourModel.deleteMany({ location, sourceType });
  }

  async embedText(_text: string): Promise<number[]> {
    this.logger.warn('Embedding is disabled for this deployment.');
    return [];
  }
  
  
}

