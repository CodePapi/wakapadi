// src/services/auth.service.ts
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { User } from '../schemas/user.schema';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const RESET_SECRET = process.env.JWT_SECRET + '_RESET'; // Different from login token

type UserDocument = User & Document & { _id: string };

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  private readonly configService: ConfigService, // ⬅️ Index [1]
  private mailService: MailService,


  ) {}

  async register({ email, password, username }) {
    if (!email || !password || !username) {
      throw new BadRequestException('Email, password, and username are required');
    }
  
    const hash = await bcrypt.hash(password, 10);
    const user = await this.userModel.create({ email, password: hash, username });
    return { token: this.signToken(user._id, username),  userId: user._id.toString(), // Convert ObjectId to string
    username: user.username };
  }
  

  async login({ email, password }) {
    const user = await this.userModel.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return { token: this.signToken(user._id, user.username) ,  userId: user._id.toString(), // Convert ObjectId to string
    username: user.username};
  }

  private signToken(id: string, username: string) {
    return jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
  }


  async updateProfile(userId: string, updates: any) {
    const allowedFields = ['travelPrefs', 'languages', 'socials', 'profileVisible'];
    const filtered: any = {};
  
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filtered[key] = updates[key];
      }
    }
  
    // Flatten nested socials if sent directly
    if (updates.instagram || updates.twitter) {
      filtered.socials = {
        ...(updates.instagram && { instagram: updates.instagram }),
        ...(updates.twitter && { twitter: updates.twitter })
      };
    }
  
    const updatedUser = await this.userModel.findByIdAndUpdate(userId, filtered, { new: true });
    return updatedUser;
  }

  async createGuest() {
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const username = `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
    const email = `guest-${Date.now()}-${randomSuffix}@wakapadi.local`;
    const password = await bcrypt.hash(`${Date.now()}-${randomSuffix}`, 10);

    const user = await this.userModel.create({
      email,
      password,
      username,
      authProvider: 'guest',
      profileVisible: false,
    });

    return {
      token: this.signToken(user._id, user.username),
      userId: user._id.toString(),
      username: user.username,
      guest: true,
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
      socials: user.socials || {}
    };
  }
  


async verifyGoogleToken(idToken: string) {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw new UnauthorizedException('Invalid Google token');
  }

  return {
    email: payload.email,
    username: payload.name,
    avatarUrl: payload.picture,
    googleId: payload.sub,
  };
}
  
  async googleLogin(googleUser: any) {
    const existingUser = await this.userModel.findOne({ email: googleUser.email });
    if (existingUser) {
      return {
        token: this.signToken(existingUser._id, existingUser.username),
        userId: existingUser._id.toString(),
        username: existingUser.username,
      };
    }
  
    const newUser = await this.userModel.create({
      email: googleUser.email,
      username: googleUser.username,
      avatarUrl: googleUser.avatarUrl,
      password: '', // Optional: use random hash or flag for social login
    });
  
    return {
      token: this.signToken(newUser._id, newUser.username),
      userId: newUser._id.toString(),
      username: newUser.username,
    };
  }
  

  async requestPasswordReset(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('No user found with that email');
    }

    const token = jwt.sign(
      { userId: user._id },
      RESET_SECRET,
      { expiresIn: '15m' },
    );

    await this.mailService.sendPasswordResetEmail(email, token);
    // console.log("token", token)
    return { message: 'Reset instructions sent if email exists' };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;

    try {
      payload = jwt.verify(token, RESET_SECRET);
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.userModel.findById(payload.userId);
    if (!user) throw new NotFoundException('User not found');

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    const authToken = this.signToken(user._id, user.username);

    return {
      token: authToken,
      userId: user._id.toString(),
      username: user.username,
      message: 'Password reset successful',
    };
  }


}
