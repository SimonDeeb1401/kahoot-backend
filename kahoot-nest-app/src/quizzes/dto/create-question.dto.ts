import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateQuestionDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  text!: string;

  @IsInt()
  @Min(1)
  position!: number;

  @IsInt()
  @Min(1)
  timeLimit!: number;

  @IsInt()
  @Min(0)
  points!: number;
}