import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class UpdateGameSessionDto {
  @IsOptional()
  @IsIn(['waiting', 'active', 'finished'])
  status?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string | null;

  @IsOptional()
  @IsDateString()
  endedAt?: string | null;
}