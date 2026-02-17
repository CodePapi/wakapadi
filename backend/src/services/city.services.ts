/// Step 2: CityService
// src/services/city.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { City } from '../schemas/city.schema';

@Injectable()
export class CityService {
  constructor(@InjectModel(City.name) private cityModel: Model<City>) {}

  private formatCityName(name: string): string {
    if (!name) return '';
    // Collapse whitespace and trim
    let s = name.replace(/\s+/g, ' ').trim();
    // Title-case words, preserving punctuation like parentheses and hyphens
    s = s.replace(/([^\s]+)/g, (token) => {
      return token.replace(/\p{L}[^\s]*/gu, (word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });
    });
    return s;
  }

  private stripParenthetical(name: string) {
    return (name || '').replace(/\s*\(.*?\)\s*/g, '').trim();
  }

  private escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // Public formatting helper for other services/controllers
  formatForStorage(name: string) {
    return this.formatCityName(name)
  }

  async getAllCities(): Promise<string[]> {
    const cities = await this.cityModel.find().exec();
    return cities
      .map((city) => this.formatCityName(city.name))
      .sort((a, b) => a.localeCompare(b));
  }

  async addCities(newCities: string[]): Promise<string[]> {
    const formattedCities = newCities.map((c) => this.formatForStorage(c));
    const existing = await this.cityModel.find({ name: { $in: formattedCities } }).exec();
    const existingNames = new Set(existing.map((c) => c.name));

    const toInsert = formattedCities.filter((name) => !existingNames.has(name));

    if (toInsert.length > 0) {
      await this.cityModel.insertMany(toInsert.map((name) => ({ name })));
    }

    return toInsert.sort((a, b) => a.localeCompare(b));
  }

  async cityExists(name: string): Promise<boolean> {
    const formattedName = this.formatForStorage(name);
    const stripped = this.stripParenthetical(formattedName);
    const regexExact = new RegExp('^' + this.escapeRegex(formattedName) + '$', 'i');
    const regexStripped = new RegExp('^' + this.escapeRegex(stripped) + '$', 'i');
    const count = await this.cityModel.countDocuments({ $or: [{ name: regexExact }, { name: regexStripped }] }).exec();
    return count > 0;
  }

  async addSingleCity(name: string): Promise<boolean> {
    const formattedName = this.formatForStorage(name);
    const exists = await this.cityExists(formattedName);
    if (!exists) {
      await this.cityModel.create({ name: formattedName });
      return true;
    }
    return false;
  }
}

