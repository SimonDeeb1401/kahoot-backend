import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuizDto {
  @ApiProperty({ example: 'World geography', minLength: 1, maxLength: 255 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    type: String,
    example: 'A quiz about countries and capitals.',
    maxLength: 10000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string | null;
}