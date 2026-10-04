import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGamePlayerDto {
  @ApiProperty({ example: 'Player One', minLength: 1, maxLength: 32 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  nickname!: string;

  @ApiPropertyOptional({ type: Number, example: 42, minimum: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  userId?: number | null;
}