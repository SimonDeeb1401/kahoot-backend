import { IsInt, Min } from 'class-validator';

export class CreatePlayerAnswerDto {
  @IsInt()
  @Min(1)
  playerId!: number;

  @IsInt()
  @Min(1)
  questionId!: number;

  @IsInt()
  @Min(1)
  answerId!: number;

  @IsInt()
  @Min(0)
  responseTimeMs!: number;
}