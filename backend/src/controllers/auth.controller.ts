// src/auth/auth.controller.ts
import { Controller, Post, Body, Get, UseGuards, Req, Patch, Delete, Query } from '@nestjs/common';
import { AuthGuard } from '../gateways/auth.guard';
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

  @Get('visits/daily')
  async getDailyVisits(@Query('day') day?: string) {
    return this.authService.getDailyVisits(day);
  }

  @Post('anonymous')
  createAnonymous(@Body('deviceId') deviceId: string) {
    return this.authService.createAnonymous(deviceId);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req, @Body() body) {
    return this.authService.updateProfile(req.user.id, body);
  }


  @Delete('me')
  @UseGuards(AuthGuard)
  async deleteMe(@Req() req) {
    return this.authService.deleteAccount(req.user.id);
  }
}
