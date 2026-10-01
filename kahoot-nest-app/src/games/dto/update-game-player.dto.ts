import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateGamePlayerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  nickname?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;
}