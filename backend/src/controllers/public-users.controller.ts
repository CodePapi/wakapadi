import { Controller, Get, Param, Req } from '@nestjs/common';
import { UsersService } from '../services/user.service';

@Controller('public/users')
export class PublicUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('preferences/:userId')
  async getPreferences(@Param('userId') userId: string) {
    return this.usersService.getPreferences(userId);
  }

  @Get('preferences/batch')
  async getPreferencesBatch(@Req() req) {
    const idsRaw = req.query.ids as string | undefined;
    if (!idsRaw) return [];
    const ids = String(idsRaw).split(',').map((s) => s.trim()).filter(Boolean);
    return this.usersService.getPreferencesBatch(ids);
  }
}
