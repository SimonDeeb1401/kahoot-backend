import { IsDateString, IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGameSessionDto {
  @ApiPropertyOptional({ example: 'active', enum: ['waiting', 'active', 'finished'] })
  @IsOptional()
  @IsIn(['waiting', 'active', 'finished'])
  status?: string;

  @ApiPropertyOptional({ type: String, example: '2026-10-04T12:00:00.000Z', format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  startedAt?: string | null;

  @ApiPropertyOptional({ type: String, example: '2026-10-04T12:30:00.000Z', format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  endedAt?: string | null;
}