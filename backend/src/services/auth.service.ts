import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { LoginDto, RegisterDto } from 'src/types/auth.dto';
import { User } from '../schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userModel.findOne({ 
      $or: [{ email: dto.email }, { username: dto.username }] 
    });
    if (exists) {
      
      throw new BadRequestException('Email or username already in use');
    }

    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.userModel.create({
      email: dto.email,
      username: dto.username,
      password: hash,
      isOnline: true,
      lastActive: new Date(),
    });

    return this.generateToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email }).select('+password');
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userModel.updateOne(
      { _id: user._id },
      { isOnline: true, lastActive: new Date() }
    );

    return this.generateToken(user);
  }

  private generateToken(user: User) {
    return {
      access_token: this.jwtService.sign({
        sub: user._id,
        username: user.username,
        role: user.role,
      }),
    };
  }
}