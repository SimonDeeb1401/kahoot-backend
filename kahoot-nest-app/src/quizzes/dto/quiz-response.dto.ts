import { ApiProperty } from '@nestjs/swagger';

export class QuizResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'World geography', maxLength: 255 })
  title!: string;

  @ApiProperty({
    type: String,
    example: 'A quiz about countries and capitals.',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ example: 1 })
  creatorId!: number;

  @ApiProperty({ example: '2026-10-04T12:00:00.000Z', format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-10-04T12:30:00.000Z', format: 'date-time' })
  updatedAt!: Date;
}
