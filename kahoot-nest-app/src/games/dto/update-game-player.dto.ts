import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGamePlayerDto {
  @ApiPropertyOptional({ example: 'Player One', minLength: 1, maxLength: 32 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  nickname?: string;

  @ApiPropertyOptional({ example: 100, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;
}