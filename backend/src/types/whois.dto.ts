// src/dtos/whois.dto.ts
import { IsString, IsOptional, IsNumber, IsArray, ArrayMinSize, ValidateNested, IsObject, IsBoolean } from 'class-validator';
// import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class PingPresenceDto {
  @IsString()
  city: string;

  @IsObject()
  coordinates: {
    lat: number;
    lng: number;
  };

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export interface NearbyUserResult {
  id: Types.ObjectId;
  city: string;
  coordinates: { lat: number; lng: number };
  lastSeen: Date;
  anonymous?: boolean;
  user?: {
    username?: string;
    avatarUrl?: string;
    socials?: any;
  };
}
export class NearbyUserDto {
  id?: string;
  username: string;
  avatarUrl?: string;
  distance?: number;
  socials?: {
    instagram?: string;
    whatsapp?: string;
  };
}



class CoordinatesDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class NearbyQueryDto {
  @IsString()
  city: string;

  @IsOptional()
  @IsNumber()
  radius?: number;

  @IsOptional()
  @ValidateNested()
  // @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;
}