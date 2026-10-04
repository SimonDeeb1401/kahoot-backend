import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGameSessionDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quizId!: number;

  @ApiPropertyOptional({ example: 'A2BC34', maxLength: 16 })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  roomCode?: string;
}