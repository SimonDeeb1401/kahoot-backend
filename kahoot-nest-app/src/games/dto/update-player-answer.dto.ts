import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdatePlayerAnswerDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  responseTimeMs?: number;
}