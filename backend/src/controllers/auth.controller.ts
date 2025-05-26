import { Controller, Post, Body, Get, UseGuards, Req, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '../gateways/auth.guard';
import { AuthService } from '../services/auth.service';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { LoginDto, RegisterDto } from 'src/types/auth.dto';
import { Public } from '../gateways/decorators/public.decorator';
import crypto from "crypto"
import { UserService } from '../services/user.service';
import { MailService } from 'src/services/mail.service';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    // private readonly userService: UserService,
    // private readonly mailService: MailService,
  ) {}

  @Post('register')
  @Public() // This endpoint is publicly accessible
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Post('login')
  @Public() // This endpoint is publicly accessible
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Add to your auth.controller.ts
  // @Post('forgot-password')
  // async forgotPassword(@Body() body: { email: string }) {
  //   const user = await this.userService.findByEmail(body.email);
  //   if (!user) {
  //     return { message: 'If this email exists, a reset link has been sent' };
  //   }

  //   const resetToken = this.authService.generateResetToken();
  //   const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

  //   await this.userService.updateResetToken(user._id, resetToken, resetTokenExpiry);

  //   const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  //   await this.mailService.sendPasswordReset(user.email, resetUrl);

  //   return { message: 'Password reset link sent to your email' };
  // }

  // @Post('reset-password')
  // async resetPassword(@Body() body: { token: string; password: string }) {
  //   const user = await this.userService.findByResetToken(body.token);
  //   if (!user || user.resetTokenExpiry < new Date()) {
  //     throw new BadRequestException('Invalid or expired token');
  //   }

  //   await this.userService.updatePassword(user._id, body.password);
  //   await this.userService.clearResetToken(user._id);

  //   return { message: 'Password reset successfully' };
  // }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiResponse({ status: 200, description: 'Returns authenticated user data' })
  getProfile(@Req() req) {
    console.log("user", req.user)
    return {
      id: req.user.sub,
      email: req.user.email,
      lastActive: req.user.lastActive
    };
  }
}