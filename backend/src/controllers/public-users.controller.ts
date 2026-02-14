import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from '../services/user.service';

@Controller('public/users')
export class PublicUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('preferences/:userId')
  async getPreferences(@Param('userId') userId: string) {
    return this.usersService.getPreferences(userId);
  }
}
