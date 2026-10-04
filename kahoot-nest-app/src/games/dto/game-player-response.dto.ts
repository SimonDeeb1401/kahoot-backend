import { ApiProperty } from '@nestjs/swagger';

export class GamePlayerResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  sessionId!: number;

  @ApiProperty({ type: Number, example: 42, nullable: true })
  userId!: number | null;

  @ApiProperty({ example: 'Player One', maxLength: 32 })
  nickname!: string;

  @ApiProperty({ example: 0, minimum: 0 })
  score!: number;
}
