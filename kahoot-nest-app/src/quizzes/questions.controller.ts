import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/auth.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateQuestionDto } from './dto/create-question.dto.js';
import { UpdateQuestionDto } from './dto/update-question.dto.js';
import { QuestionsService } from './questions.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('quizzes/:quizId/questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.questionsService.create(request.user.sub, quizId, dto);
  }

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
  ) {
    return this.questionsService.findAll(request.user.sub, quizId);
  }

  @Get(':questionId')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    return this.questionsService.findOne(request.user.sub, quizId, questionId);
  }

  @Patch(':questionId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(
      request.user.sub,
      quizId,
      questionId,
      dto,
    );
  }

  @Delete(':questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ): Promise<void> {
    return this.questionsService.remove(request.user.sub, quizId, questionId);
  }
}