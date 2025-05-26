import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
export class SendMessageDto {
    @IsString()
    @IsNotEmpty()
    fromUserId: string; // Add this field
  
    @IsString()
    @IsNotEmpty()
    toUserId: string;
  
    @IsString()
    @IsNotEmpty()
    message: string;
  }
  
  export class GetThreadQueryDto {
    @IsString()
    @IsNotEmpty()
    userId: string;
  
    @IsString()
    @IsNotEmpty()
    targetUserId: string;
  
    @IsOptional()
    @IsNumber()
    @Min(1)
    page: number = 1;
  
    @IsOptional()
    @IsNumber()
    @Min(1)
    limit: number = 20;
  }