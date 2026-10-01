import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Answer } from '../quizzes/entities/answer.entity.js';
import { Question } from '../quizzes/entities/question.entity.js';
import { Quiz } from '../quizzes/entities/quiz.entity.js';
import { GamePlayer } from './entities/game-player.entity.js';
import { GameSession } from './entities/game-session.entity.js';
import { PlayerAnswer } from './entities/player-answer.entity.js';
import { GamesController } from './games.controller.js';
import { GameEngineService } from './game-engine.service.js';
import { GamesGateway } from './games.gateway.js';
import { GamesService } from './games.service.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      GameSession,
      GamePlayer,
      PlayerAnswer,
      Quiz,
      Question,
      Answer,
    ]),
  ],
  controllers: [GamesController],
  providers: [GamesService, GameEngineService, GamesGateway],
})
export class GamesModule {}