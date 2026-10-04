import { ApiProperty } from '@nestjs/swagger';

export class JoinedRoomPlayerResponseDto {
  @ApiProperty({ example: 1 })
  playerId!: number;

  @ApiProperty({ example: 1 })
  sessionId!: number;

  @ApiProperty({ example: 'A2BC34' })
  roomCode!: string;

  @ApiProperty({ example: 'Player One' })
  nickname!: string;
}

export class JoinedRoomSummaryResponseDto extends JoinedRoomPlayerResponseDto {
  @ApiProperty({ example: 'waiting', enum: ['waiting', 'active', 'finished'] })
  status!: string;

  @ApiProperty({ example: 'World geography' })
  quizTitle!: string;
}
