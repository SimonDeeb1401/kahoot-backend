import { ApiProperty } from '@nestjs/swagger';

export class QuestionResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  quizId!: number;

  @ApiProperty({ example: 'What is the capital of France?' })
  text!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  position!: number;

  @ApiProperty({ example: 30, minimum: 1 })
  timeLimit!: number;

  @ApiProperty({ example: 1000, minimum: 0 })
  points!: number;
}
