import { Transform } from 'class-transformer';
import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinGameSessionDto {
  @ApiProperty({ example: 'A2BC34', minLength: 1, maxLength: 16, pattern: '^[A-Z0-9]+$' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  @Matches(/^[A-Z0-9]+$/)
  roomCode!: string;

  @ApiProperty({ example: 'Player One', minLength: 1, maxLength: 32 })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  nickname!: string;
}