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
import { CreateAnswerDto } from './dto/create-answer.dto.js';
import { UpdateAnswerDto } from './dto/update-answer.dto.js';
import { AnswersService } from './answers.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('quizzes/:quizId/questions/:questionId/answers')
@UseGuards(JwtAuthGuard)
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: CreateAnswerDto,
  ) {
    return this.answersService.create(
      request.user.sub,
      quizId,
      questionId,
      dto,
    );
  }

  @Get()
  findAll(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    return this.answersService.findAll(
      request.user.sub,
      quizId,
      questionId,
    );
  }

  @Get(':answerId')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Param('answerId', ParseIntPipe) answerId: number,
  ) {
    return this.answersService.findOne(
      request.user.sub,
      quizId,
      questionId,
      answerId,
    );
  }

  @Patch(':answerId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Param('answerId', ParseIntPipe) answerId: number,
    @Body() dto: UpdateAnswerDto,
  ) {
    return this.answersService.update(
      request.user.sub,
      quizId,
      questionId,
      answerId,
      dto,
    );
  }

  @Delete(':answerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Param('answerId', ParseIntPipe) answerId: number,
  ): Promise<void> {
    return this.answersService.remove(
      request.user.sub,
      quizId,
      questionId,
      answerId,
    );
  }
}