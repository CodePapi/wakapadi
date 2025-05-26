// user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import bcrypt from "bcrypt"

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  async findByResetToken(token: string) {
    return this.userModel.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });
  }

  async updateResetToken(userId: string, token: string, expiry: Date) {
    return this.userModel.updateOne(
      { _id: userId },
      { resetToken: token, resetTokenExpiry: expiry }
    );
  }

  async updatePassword(userId: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.userModel.updateOne(
      { _id: userId },
      { password: hashedPassword }
    );
  }

  async clearResetToken(userId: string) {
    return this.userModel.updateOne(
      { _id: userId },
      { resetToken: null, resetTokenExpiry: null }
    );
  }
}