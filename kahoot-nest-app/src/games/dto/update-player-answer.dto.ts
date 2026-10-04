import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlayerAnswerDto {
  @ApiPropertyOptional({ example: 5000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  responseTimeMs?: number;
}