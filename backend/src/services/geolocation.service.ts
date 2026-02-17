// src/geolocation/geolocation.service.ts

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

type IpCount = { count: number; windowStart: number };

@Injectable()
export class GeolocationService {
  async reverseGeocode(lat: string, lon: string): Promise<any> {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'YourAppName/1.0 (your@email.com)',
        },
      });

      return response.data;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch location data',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Simple in-memory cache + per-IP rate limiting for IP lookups.
  private ipCache: { data: any | null; ts: number } = { data: null, ts: 0 }
  private cacheTtlMs: number = Number(process.env.GEO_IP_CACHE_TTL_MS || 60 * 1000) // default 60s

  // per-IP counters
  private perIpCounts: Map<string, IpCount> = new Map()
  private perIpWindowMs: number = Number(process.env.GEO_IP_WINDOW_MS || 60 * 1000)
  private perIpMax: number = Number(process.env.GEO_IP_MAX_PER_WINDOW || 60)

  async ipLookup(clientIp?: string): Promise<any> {
    // feature flag: disable proxy if explicitly turned off
    const enabled = (process.env.GEO_IP_PROXY_ENABLED || '1') !== '0'
    if (!enabled) {
      throw new HttpException('IP geolocation proxy is disabled', HttpStatus.NOT_FOUND)
    }

    const now = Date.now()

    // enforce per-IP rate limit
    if (clientIp) {
      const entry = this.perIpCounts.get(clientIp)
      if (!entry || now - entry.windowStart > this.perIpWindowMs) {
        this.perIpCounts.set(clientIp, { count: 1, windowStart: now })
      } else {
        if (entry.count >= this.perIpMax) {
          throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS)
        }
        entry.count += 1
        this.perIpCounts.set(clientIp, entry)
      }
    }

    // return cached value if fresh
    if (this.ipCache.data && (now - this.ipCache.ts) < this.cacheTtlMs) {
      return this.ipCache.data
    }

    try {
      const res = await axios.get('https://ipapi.co/json/', {
        headers: {
          'User-Agent': 'Wakapadi/1.0 (contact@wakapadi.example)',
        },
        timeout: 5000,
      })
      this.ipCache = { data: res.data, ts: Date.now() }
      return res.data
    } catch (err) {
      throw new HttpException('Failed to lookup IP geolocation', HttpStatus.BAD_REQUEST)
    }
  }
}
