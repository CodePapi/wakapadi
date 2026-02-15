import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User } from "../schemas/user.schema";
import { UserReport } from "../schemas/user-report.schema";
import { UserBlock } from "../schemas/user-block.schema";
import { WhoisGateway } from '../gateways/whois.gateway';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserReport.name) private reportModel: Model<UserReport>,
    @InjectModel(UserBlock.name) private blockModel: Model<UserBlock>,
    @Inject(forwardRef(() => WhoisGateway)) private readonly gateway?: WhoisGateway,
  ) {}
  async getAllUsers() {
    return this.userModel.find().select('username email role _id').lean();
  }
  async deleteUser(userId: string) {
    // Remove the user by ID
    await this.userModel.findByIdAndDelete(userId);
    // Optionally: remove related blocks, reports, etc.
    await this.blockModel.deleteMany({ $or: [{ blockerId: userId }, { blockedId: userId }] });
    await this.reportModel.deleteMany({ $or: [{ reporterId: userId }, { reportedId: userId }] });
    return { success: true };
  }

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

    // Allow updating profile text fields
    if (typeof data.username === 'string' && data.username.trim() !== '') {
      update.username = data.username.trim();
    }

    if (typeof data.bio === 'string') {
      update.bio = data.bio;
    }

    if (typeof data.avatarUrl === 'string') {
      update.avatarUrl = data.avatarUrl;
    }

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

  async unblockUser(currentUserId: string, targetUserId: string) {
    const blockerId = new Types.ObjectId(currentUserId);
    const blockedId = new Types.ObjectId(targetUserId);

    const res = await this.blockModel.deleteOne({ blockerId, blockedId });
    const deletedCount = res.deletedCount || 0;

    // Emit real-time update to both parties if gateway available
    try {
      const statusForCurrent = await this.isBlockedBetween(currentUserId, targetUserId);
      const statusForTarget = await this.isBlockedBetween(targetUserId, currentUserId);
      if (this.gateway) {
        console.log(`Emitting block change to ${currentUserId} and ${targetUserId}`, { statusForCurrent, statusForTarget });
        // Notify the user who performed the unblock
        this.gateway.emitToUser(currentUserId, 'user:block:changed', { changedBy: currentUserId, status: statusForCurrent });
        // Notify the other user that their relationship changed
        this.gateway.emitToUser(targetUserId, 'user:block:changed', { changedBy: currentUserId, status: statusForTarget });
        console.log('Emit attempts complete');
      } else {
        console.log('WhoisGateway not available to emit block change');
      }
    } catch (err) {
      console.warn('Failed to emit unblock socket event', err);
    }

    return { success: true, deletedCount };
  }

  async isBlockedBetween(userA: string, userB: string) {
    const a = new Types.ObjectId(userA);
    const b = new Types.ObjectId(userB);

    const blockedByA = await this.blockModel.findOne({ blockerId: a, blockedId: b }).lean();
    const blockedByB = await this.blockModel.findOne({ blockerId: b, blockedId: a }).lean();
    const reported = await this.reportModel.findOne({ $or: [ { reporterId: a, reportedId: b }, { reporterId: b, reportedId: a } ] }).lean();

    return {
      blockedByMe: !!blockedByA,
      blockedByThem: !!blockedByB,
      anyBlocked: !!(blockedByA || blockedByB),
      anyReported: !!reported,
    };
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
