// src/services/auth.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { createHash } from 'crypto';
import { User } from '../schemas/user.schema';
import { DailyVisit } from '../schemas/daily-visit.schema';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

type UserDocument = User & Document & { _id: string };

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(DailyVisit.name)
    private readonly dailyVisitModel: Model<DailyVisit>,
  ) {}

  private signToken(id: string, username: string) {
    return jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
  }

  async updateProfile(userId: string, updates: any) {
    const allowedFields = ['travelPrefs', 'languages', 'socials', 'profileVisible', 'gender'];
    const filtered: any = {};

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filtered[key] = updates[key];
      }
    }

    if (updates.instagram || updates.twitter) {
      filtered.socials = {
        ...(updates.instagram && { instagram: updates.instagram }),
        ...(updates.twitter && { twitter: updates.twitter }),
      };
    }

    return this.userModel.findByIdAndUpdate(userId, filtered, { new: true });
  }

  private getDeviceHash(deviceId: string) {
    return createHash('sha256').update(deviceId).digest('hex');
  }

  private getUtcDayString(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  private async recordDailyVisit(deviceHash: string) {
    const day = this.getUtcDayString();
    try {
      await this.dailyVisitModel.create({ deviceHash, day });
    } catch (err) {
      if (err?.code !== 11000) {
        throw err;
      }
    }
  }

  async getDailyVisits(day?: string) {
    const targetDay = day || this.getUtcDayString();
    const count = await this.dailyVisitModel.countDocuments({ day: targetDay });
    return { day: targetDay, uniqueVisitors: count };
  }

  private buildAnonUsername() {
    const names = [
      'Curious Fox',
      'Quiet Otter',
      'Sunny Sparrow',
      'Brave Badger',
      'Gentle Panda',
      'Wandering Wolf',
      'Lucky Lynx',
      'Cozy Koala',
      'Kind Kestrel',
      'Playful Puffin',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  async createAnonymous(deviceId: string) {
    if (!deviceId) {
      throw new BadRequestException('Device id is required');
    }

    const deviceHash = this.getDeviceHash(deviceId);
    let user = await this.userModel.findOne({ deviceIdHash: deviceHash });

    if (!user) {
      const username = this.buildAnonUsername();
      const email = `anon-${deviceHash.slice(0, 10)}@wakapadi.local`;

      user = await this.userModel.create({
        email,
        password: '',
        username,
        authProvider: 'anonymous',
        deviceIdHash: deviceHash,
        profileVisible: true,
        lastSeenAt: new Date(),
      });
    } else {
      user.lastSeenAt = new Date();
      await user.save();
    }

    await this.recordDailyVisit(deviceHash);

    return {
      token: this.signToken(user._id, user.username),
      userId: user._id.toString(),
      username: user.username,
      anonymous: true,
    };
  }

  async findUserById(userId: string) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) throw new NotFoundException('User not found');

    return {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      travelPrefs: user.travelPrefs || [],
      languages: user.languages || [],
      socials: user.socials || {},
      gender: user.gender,
      profileVisible: user.profileVisible,
    };
  }

  async deleteAccount(userId: string) {
    const user = await this.userModel.findByIdAndDelete(userId).lean();
    if (!user) throw new NotFoundException('User not found');
    return { success: true };
  }
}
