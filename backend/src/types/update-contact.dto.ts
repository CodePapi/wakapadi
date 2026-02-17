import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateContactDto {
  @IsOptional()
  @IsBoolean()
  attended?: boolean;

  @IsOptional()
  @IsString()
  attendedBy?: string;

  @IsOptional()
  @IsString()
  attendedNote?: string;
}
