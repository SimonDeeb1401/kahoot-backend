import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateGameSessionDto {
  @IsInt()
  @Min(1)
  quizId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  roomCode?: string;
}