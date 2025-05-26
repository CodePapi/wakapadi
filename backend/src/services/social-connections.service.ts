import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';

@Injectable()
export class SocialConnectionsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async addSocialConnection(userId: string, platform: 'instagram' | 'whatsapp' | 'twitter', value: string) {
    return this.userModel.updateOne(
      { _id: userId },
      { $set: { [`socials.${platform}`]: value } },
      { upsert: true }
    );
  }
// Update method:
// In social-connections.service.ts
async getSharedConnections(userId1: string, userId2: string): Promise<('instagram' | 'whatsapp' | 'twitter')[]> {
    const [user1, user2] = await Promise.all([
      this.userModel.findById(userId1).select('socials').lean(),
      this.userModel.findById(userId2).select('socials').lean(),
    ]);
  
    if (!user1?.socials || !user2?.socials) return [];
  
    const shared: ('instagram' | 'whatsapp' | 'twitter')[] = []; // Explicit type
    const platforms = ['instagram', 'whatsapp', 'twitter'] as const;
    
    platforms.forEach(platform => {
      if (user1.socials![platform] && user2.socials![platform]) {
        shared.push(platform);
      }
    });
    
    return shared;
  }


//   async getSharedConnections(userId1: string, userId2: string) {
//     const [user1, user2] = await Promise.all([
//       this.userModel.findById(userId1).select('socials'),
//       this.userModel.findById(userId2).select('socials'),
//     ]);

//     if (!user1 || !user2) return [];

//     const shared = [];
//     for (const platform in user1.socials) {
//       if (user1.socials[platform] && user2.socials[platform]) {
//         shared.push(platform);
//       }
//     }
//     return shared;
//   }

  async findUsersBySocial(platform: string, value: string) {
    return this.userModel.find({
      [`socials.${platform}`]: new RegExp(value, 'i')
    }).select('username avatarUrl');
  }
}