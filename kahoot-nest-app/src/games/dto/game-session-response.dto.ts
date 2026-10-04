import { ApiProperty } from '@nestjs/swagger';

export class GameSessionResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  quizId!: number;

  @ApiProperty({ example: 1 })
  hostId!: number;

  @ApiProperty({ example: 'A2BC34', maxLength: 16 })
  roomCode!: string;

  @ApiProperty({ example: 'waiting', enum: ['waiting', 'active', 'finished'] })
  status!: string;

  @ApiProperty({
    type: String,
    example: '2026-10-04T12:00:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  startedAt!: Date | null;

  @ApiProperty({
    type: String,
    example: '2026-10-04T12:30:00.000Z',
    format: 'date-time',
    nullable: true,
  })
  endedAt!: Date | null;
}
