import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnswerDto {
  @ApiProperty({ example: 'Paris', minLength: 1, maxLength: 2000 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect!: boolean;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  position!: number;
}