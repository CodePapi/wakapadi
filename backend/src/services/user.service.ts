import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User } from "../schemas/user.schema";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async getPreferences(userId: string) {
    return this.userModel
      .findById(userId)
      .select('travelPrefs languages socials bio avatarUrl username profileVisible gender')
      .lean();
  }

  async updatePreferences(userId: string, data: Partial<User>) {
    const update: any = {
      travelPrefs: data.travelPrefs,
      languages: data.languages,
      socials: {
        instagram: data.socials?.instagram || '',
        twitter: data.socials?.twitter || '',
        whatsapp: data.socials?.whatsapp || '',
      },
    };

    if (typeof data.profileVisible === 'boolean') {
      update.profileVisible = data.profileVisible;
    }

    if (data.gender) {
      update.gender = data.gender;
    }
  
    return this.userModel.findByIdAndUpdate(userId, update, { new: true }).lean();
  }
  

  async blockUser(currentUserId: string, targetUserId: string) {
    // Add actual block logic here (e.g., storing blocks in a collection or user schema array)
    console.log(`User ${currentUserId} blocked ${targetUserId}`);
    return { success: true };
  }

  async reportUser(reporterId: string, reportedId: string, reason: string) {
    console.log(`Report: ${reporterId} → ${reportedId}: ${reason}`);
    // Save to a Report collection or alert admin
    return { success: true };
  }
}
