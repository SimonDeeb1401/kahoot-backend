import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty({ example: 'What is the capital of France?', minLength: 1, maxLength: 10000 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  text!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  position!: number;

  @ApiProperty({ example: 30, minimum: 1 })
  @IsInt()
  @Min(1)
  timeLimit!: number;

  @ApiProperty({ example: 1000, minimum: 0 })
  @IsInt()
  @Min(0)
  points!: number;
}