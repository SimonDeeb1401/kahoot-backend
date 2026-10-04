import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuestionDto {
  @ApiPropertyOptional({ example: 'What is the capital of France?', minLength: 1, maxLength: 10000 })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  text?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  position?: number;

  @ApiPropertyOptional({ example: 30, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimit?: number;

  @ApiPropertyOptional({ example: 1000, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number;
}