import { ApiProperty } from '@nestjs/swagger';

export class AnswerResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  questionId!: number;

  @ApiProperty({ example: 'Paris' })
  text!: string;

  @ApiProperty({ example: true })
  isCorrect!: boolean;

  @ApiProperty({ example: 1, minimum: 1 })
  position!: number;
}
