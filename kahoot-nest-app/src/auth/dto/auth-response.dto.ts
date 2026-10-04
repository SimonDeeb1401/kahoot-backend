import { ApiProperty } from '@nestjs/swagger';

export class PublicUserResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'kahoot_player', maxLength: 32 })
  username!: string;

  @ApiProperty({ example: 'player@example.com', format: 'email' })
  email!: string;

  @ApiProperty({ example: '2026-10-04T12:00:00.000Z', format: 'date-time' })
  createdAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer', enum: ['Bearer'] })
  tokenType!: 'Bearer';

  @ApiProperty({ type: PublicUserResponseDto })
  user!: PublicUserResponseDto;
}
