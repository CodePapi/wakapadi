import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User } from "../schemas/user.schema";
import { UserReport } from "../schemas/user-report.schema";
import { UserBlock } from "../schemas/user-block.schema";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserReport.name) private reportModel: Model<UserReport>,
    @InjectModel(UserBlock.name) private blockModel: Model<UserBlock>,
  ) {}

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
    const blockerId = new Types.ObjectId(currentUserId);
    const blockedId = new Types.ObjectId(targetUserId);

    const existing = await this.blockModel.findOne({ blockerId, blockedId });
    if (existing) {
      return { success: true, alreadyBlocked: true };
    }

    await this.blockModel.create({ blockerId, blockedId });
    return { success: true };
  }

  async reportUser(reporterId: string, reportedId: string, reason: string) {
    await this.reportModel.create({
      reporterId: new Types.ObjectId(reporterId),
      reportedId: new Types.ObjectId(reportedId),
      reason,
    });
    return { success: true };
  }

  async getReports() {
    return this.reportModel
      .find()
      .sort({ createdAt: -1 })
      .populate('reporterId', 'username email')
      .populate('reportedId', 'username email')
      .lean();
  }

  async getBlocks() {
    return this.blockModel
      .find()
      .sort({ createdAt: -1 })
      .populate('blockerId', 'username email')
      .populate('blockedId', 'username email')
      .lean();
  }
}
