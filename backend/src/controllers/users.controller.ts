import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  Delete,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '../services/user.service';
import { AuthGuard } from '../gateways/auth.guard';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Delete(':userId')
  async deleteUser(@Req() req, @Param('userId') userId: string) {
    // Only allow admins
    // if (req.user?.role !== 'admin') {
    //   throw new ForbiddenException('Only admins can delete users');
    // }
    return this.usersService.deleteUser(userId);
  }
  @Get('all')
  async getAllUsers(@Req() req) {
    // Only allow admins
    // if (req.user?.role !== 'admin') {
    //   throw new ForbiddenException('Only admins can view all users');
    // }
    return this.usersService.getAllUsers();
  }

  @Get('preferences/:userId')
  async getPreferences(@Param('userId') userId: string) {
    return this.usersService.getPreferences(userId);
  }

  @Patch('preferences')
  async updatePreferences(@Req() req, @Body() body) {
    return this.usersService.updatePreferences(req.user.id, body);
  }

  @Post('block/:userId')
  async blockUser(@Req() req, @Param('userId') targetId: string) {
    return this.usersService.blockUser(req.user.id, targetId);
  }

  @Post('report/:userId')
  async reportUser(
    @Req() req,
    @Param('userId') targetId: string,
    @Body() body: { reason: string },
  ) {
    return this.usersService.reportUser(req.user.id, targetId, body.reason);
  }

  @Get('reports')
  async getReports() {
    return this.usersService.getReports();
  }

  @Get('blocks')
  async getBlocks() {
    return this.usersService.getBlocks();
  }
}
