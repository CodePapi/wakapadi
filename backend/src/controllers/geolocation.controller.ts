// src/geolocation/geolocation.controller.ts

import { Controller, Get, Query, Req } from '@nestjs/common';
import { GeolocationService } from '../services/geolocation.service';
import type { Request } from 'express';

@Controller('geolocation')
export class GeolocationController {
  constructor(private readonly geolocationService: GeolocationService) {}

  @Get('reverse')
  async reverseGeocode(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
  ) {
    return this.geolocationService.reverseGeocode(lat, lon);
  }

  @Get('ip')
  async ipLookup(@Req() req: Request) {
    const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || ''
    return this.geolocationService.ipLookup(clientIp)
  }
}
