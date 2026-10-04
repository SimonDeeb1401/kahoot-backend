import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlayerAnswerDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  playerId!: number;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  questionId!: number;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  answerId!: number;

  @ApiProperty({ example: 5000, minimum: 0 })
  @IsInt()
  @Min(0)
  responseTimeMs!: number;
}