// src/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Req, Patch } from '@nestjs/common';
import { AuthGuard } from '../gateways/auth.guard';
import { GoogleAuthGuard } from '../gateways/google-auth.guard';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Get('me')
  @UseGuards(AuthGuard)
async getProfile(@Req() req) {
  const user = await this.authService.findUserById(req.user.id);
  return user;
}

  @Post('register')
  register(@Body() body) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body) {
    return this.authService.login(body);
  }

  @Post('guest')
  createGuest() {
    return this.authService.createGuest();
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req, @Body() body) {
    return this.authService.updateProfile(req.user.id, body);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req) {
    const user = await this.authService.googleLogin(req.user);
    return user; // Include token
  }

  @Post('google/token')
async handleGoogleToken(@Body('idToken') idToken: string) {
  const userData = await this.authService.verifyGoogleToken(idToken);
  return this.authService.googleLogin(userData); // returns your own JWT
}



@Post('forgot-password')
async forgotPassword(@Body('email') email: string) {
  return this.authService.requestPasswordReset(email);
}

@Post('reset-password')
async resetPassword(@Body() body: { token: string; newPassword: string }) {
  const { token, newPassword } = body;
  return this.authService.resetPassword(token, newPassword);
}
}
