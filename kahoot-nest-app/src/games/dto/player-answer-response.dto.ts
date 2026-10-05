import { ApiProperty } from '@nestjs/swagger';

export class PlayerAnswerResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  sessionId!: number;

  @ApiProperty({ example: 1 })
  playerId!: number;

  @ApiProperty({ example: 1 })
  questionId!: number;

  @ApiProperty({ example: 1 })
  answerId!: number;

  @ApiProperty({ example: 5000, minimum: 0 })
  responseTimeMs!: number;

  @ApiProperty({ example: true })
  isCorrect!: boolean;

  @ApiProperty({ example: 875, minimum: 0 })
  pointsAwarded!: number;
}
