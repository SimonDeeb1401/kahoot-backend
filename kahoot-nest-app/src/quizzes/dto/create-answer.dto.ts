import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAnswerDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @IsBoolean()
  isCorrect!: boolean;

  @IsInt()
  @Min(1)
  position!: number;
}