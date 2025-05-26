import { Controller, Get, Post, Delete, Body, Req, UseGuards, Query } from '@nestjs/common';
import { ObjectId, Types } from 'mongoose';
import { WhoisService } from '../services/whois.service';
import { AuthGuard, OptionalAuthGuard } from '../gateways/auth.guard';
import { NearbyQueryDto, NearbyUserResult, PingPresenceDto } from '../types/whois.dto';
import { ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UnauthorizedException } from '@nestjs/common';
import { Public } from 'src/gateways/decorators/public.decorator';

interface AuthRequest extends Request {
  user?: {
    sub: Types.ObjectId;
  };
}

@ApiBearerAuth()
@Controller('whois')
export class WhoisController {
  constructor(private readonly whoisService: WhoisService) {}

  @UseGuards(AuthGuard)
  @Post('ping')
  // @Public() // This endpoint is publicly accessible
  @ApiResponse({ status: 200, description: 'Presence updated successfully' })
  async ping(@Body() dto: PingPresenceDto, @Req() req: AuthRequest) {
    if (!req.user?.sub) {
      console.log("error ping")
      throw new UnauthorizedException();
    }

    console.log("ping", req.user.sub)
    console.log("dto here", dto)
    // const Sub: any = req.user.sub
    return this.whoisService.pingPresence(
     req.user?.sub,
     
       // Convert to ObjectId here
      dto
    );
  }

  @UseGuards(AuthGuard)
  @Delete()
  @ApiResponse({ status: 200, description: 'Presence hidden successfully' })
  async hide(@Req() req: AuthRequest) {
    if (!req.user?.sub) {
      throw new UnauthorizedException();
    }
    return this.whoisService.hidePresence(
      new Types.ObjectId(req.user.sub) // Convert to ObjectId here
    );
  }

  @UseGuards(OptionalAuthGuard)
  @Get('nearby')
  @Public() // This endpoint is publicly accessible
  @ApiQuery({ name: 'city', required: true })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns nearby users',
    type: [Object] // Adjust this to match your actual response type
  })
  async nearby(@Query() query: { city: string }, @Req() req: AuthRequest): Promise<NearbyUserResult[]> {
    const nearbyQuery: NearbyQueryDto = {
      city: query.city
    };

    console.log("nerby", query.city,  req.user)
    return this.whoisService.getNearby(
      nearbyQuery,
      req.user?.sub
    );
  }

}