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
import { CreateQuizDto } from './dto/create-quiz.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { QuizzesService } from './quizzes.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateQuizDto,
  ) {
    return this.quizzesService.create(request.user.sub, dto);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.quizzesService.findAll(request.user.sub);
  }

  @Get(':quizId')
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
  ) {
    return this.quizzesService.findOne(request.user.sub, quizId);
  }

  @Patch(':quizId')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
    @Body() dto: UpdateQuizDto,
  ) {
    return this.quizzesService.update(request.user.sub, quizId, dto);
  }

  @Delete(':quizId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('quizId', ParseIntPipe) quizId: number,
  ): Promise<void> {
    return this.quizzesService.remove(request.user.sub, quizId);
  }
}