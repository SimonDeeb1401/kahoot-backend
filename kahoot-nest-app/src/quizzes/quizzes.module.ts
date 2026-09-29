import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { Answer } from './entities/answer.entity.js';
import { Question } from './entities/question.entity.js';
import { Quiz } from './entities/quiz.entity.js';
import { AnswersController } from './answers.controller.js';
import { QuestionsController } from './questions.controller.js';
import { QuizzesController } from './quizzes.controller.js';
import { AnswersService } from './answers.service.js';
import { QuestionsService } from './questions.service.js';
import { QuizzesService } from './quizzes.service.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Quiz, Question, Answer]),
  ],
  controllers: [QuizzesController, QuestionsController, AnswersController],
  providers: [QuizzesService, QuestionsService, AnswersService],
})
export class QuizzesModule {}